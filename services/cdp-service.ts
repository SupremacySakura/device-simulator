import type { EmulationMetrics, SafeAreaInsetsOverride } from '../utils/viewport-transform';

const DEBUGGER_PROTOCOL_VERSION = '1.3';

export interface DebuggeeTarget {
  tabId: number;
}

export interface CdpSender {
  sendCommand(
    target: DebuggeeTarget,
    method: string,
    params?: Record<string, unknown>,
  ): Promise<unknown>;
  attach(target: DebuggeeTarget, version: string): Promise<void>;
  detach(target: DebuggeeTarget): Promise<void>;
}

export class DebuggerAttachError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DebuggerAttachError';
  }
}

function describeAttachFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/another debugger is already attached|already attached/i.test(message)) {
    return '该标签页已被 DevTools 占用。请先关闭此页面的 DevTools，再重新启动预览。';
  }
  if (/cannot access|cannot attach|chrome:\/\/|edge:\/\//i.test(message)) {
    return '浏览器内部页面不允许调试，无法在此页预览。请换一个普通网页重试。';
  }
  return `无法连接到标签页：${message}`;
}

/**
 * 用 chrome.debugger 附加到标签页并应用设备模拟。
 * 一个标签页只允许一个调试客户端，DevTools 已打开时会附加失败。
 */
export function createCdpClient(sender: CdpSender) {
  return {
    async attach(tabId: number): Promise<void> {
      try {
        await sender.attach({ tabId }, DEBUGGER_PROTOCOL_VERSION);
      } catch (error) {
        throw new DebuggerAttachError(describeAttachFailure(error), { cause: error });
      }
    },

    async detach(tabId: number): Promise<void> {
      try {
        await sender.detach({ tabId });
      } catch {
        // 已经分离或标签页已关闭，视为成功。
      }
    },

    async applyEmulation(
      tabId: number,
      metrics: EmulationMetrics,
      safeArea: SafeAreaInsetsOverride | null,
    ): Promise<void> {
      await sender.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
        width: metrics.width,
        height: metrics.height,
        deviceScaleFactor: metrics.deviceScaleFactor,
        mobile: metrics.mobile,
        scale: metrics.scale,
        screenOrientation: metrics.screenOrientation,
      });
      // 零安全区也必须显式归零，否则从有刘海的设备切到无刘海的设备时，
      // 上一次的 env(safe-area-inset-*) 会残留。
      await sender.sendCommand({ tabId }, 'Emulation.setSafeAreaInsetsOverride', {
        insets: safeArea ?? { top: 0, right: 0, bottom: 0, left: 0 },
      });
    },

    async clearEmulation(tabId: number): Promise<void> {
      await sender.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {});
      await sender.sendCommand({ tabId }, 'Emulation.setSafeAreaInsetsOverride', {
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    },
  };
}

export type CdpClient = ReturnType<typeof createCdpClient>;
