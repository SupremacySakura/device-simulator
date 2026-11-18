import { browser } from 'wxt/browser';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { createCdpClient, DebuggerAttachError } from '../services/cdp-service';
import { mountToolbar, type ToolbarInit } from '../services/toolbar-inject';
import type { DeviceOrientation, DeviceProfile } from '../types/device';
import { clampManualScale } from '../utils/device-scale';
import {
  getOrientedViewport,
  resolveZoom,
  toEmulationMetrics,
  toSafeAreaOverride,
} from '../utils/viewport-transform';

interface WindowSize {
  width: number;
  height: number;
}

interface PreviewSession {
  tabId: number;
  windowId: number | null;
  deviceId: string;
  orientation: DeviceOrientation;
  zoomMode: 'auto' | 'manual';
  manualScale: number;
  /**
   * 模拟生效前的真实内容区尺寸。必须在 attach 之前测量：
   * 一旦 CDP 生效，页面里的 innerWidth/innerHeight 就变成设备视口了。
   */
  windowSize: WindowSize;
  /** 窗口外框与内容区的差值，用于窗口缩放后换算。 */
  chromeDelta: WindowSize;
}

const sessions = new Map<number, PreviewSession>();

const SESSION_KEY = 'device-simulator:preview-sessions';

/**
 * MV3 的 service worker 会休眠，内存中的 Map 随之丢失。
 * 会话同时写入 storage.session，休眠后可按需恢复，避免工具条静默失效。
 */
async function persistSessions(): Promise<void> {
  try {
    await browser.storage.session.set({ [SESSION_KEY]: [...sessions.values()] });
  } catch {
    /* session 存储不可用时退化为纯内存 */
  }
}

async function loadSessions(): Promise<void> {
  if (sessions.size > 0) return;
  try {
    const stored = await browser.storage.session.get(SESSION_KEY);
    const list = stored[SESSION_KEY];
    if (!Array.isArray(list)) return;
    for (const item of list) {
      const candidate = item as PreviewSession;
      if (typeof candidate?.tabId === 'number') sessions.set(candidate.tabId, candidate);
    }
  } catch {
    /* 忽略 */
  }
}

/** 取会话：内存优先，休眠后从 storage.session 恢复。 */
async function getSession(tabId: number): Promise<PreviewSession | undefined> {
  const cached = sessions.get(tabId);
  if (cached) return cached;
  await loadSessions();
  return sessions.get(tabId);
}

const cdp = createCdpClient({
  attach: (target, version) => browser.debugger.attach(target, version),
  detach: (target) => browser.debugger.detach(target),
  sendCommand: (target, method, params) =>
    browser.debugger.sendCommand(target, method, params ?? {}),
});

let customDevices: DeviceProfile[] = [];

/** 读取用户保存的自定义设备，使工具条里能选到它们。 */
async function loadCustomDevices(): Promise<void> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEYS.devices);
    const raw = stored[STORAGE_KEYS.devices] as { data?: { customDevices?: unknown } } | undefined;
    const list = raw?.data?.customDevices;
    if (!Array.isArray(list)) return;
    customDevices = list.filter(isCustomDevice);
  } catch {
    /* 读取失败时只用系统设备 */
  }
}

function isCustomDevice(value: unknown): value is DeviceProfile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<DeviceProfile>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.portrait === 'object' &&
    candidate.portrait !== null &&
    typeof candidate.landscape === 'object' &&
    candidate.landscape !== null
  );
}

function allDevices(): DeviceProfile[] {
  return [...SYSTEM_DEVICES, ...customDevices];
}

function findDevice(deviceId: string): DeviceProfile {
  return allDevices().find((device) => device.id === deviceId) ?? SYSTEM_DEVICES[0]!;
}

function toolbarInit(
  session: PreviewSession,
  windowSize: { width: number; height: number },
): ToolbarInit {
  const device = findDevice(session.deviceId);
  const viewport = getOrientedViewport(device, session.orientation);
  const zoom = resolveZoom(viewport, windowSize, session.zoomMode, session.manualScale);
  return {
    devices: allDevices().map(({ id, name }) => ({ id, name })),
    currentDeviceId: device.id,
    orientation: session.orientation,
    zoomPercent: Math.round(zoom * 100),
    autoZoom: session.zoomMode === 'auto',
  };
}

/**
 * 在应用模拟之前测量真实内容区，并记下窗口外框与内容区的差值。
 * 之后 CDP 生效，页面内的 innerWidth 不再代表真实窗口。
 */
async function measureWindow(
  tabId: number,
): Promise<{ windowSize: WindowSize; chromeDelta: WindowSize }> {
  let content: WindowSize | null = null;
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => ({ width: window.innerWidth, height: window.innerHeight }),
    });
    const size = result?.result;
    if (size && typeof size.width === 'number' && typeof size.height === 'number') {
      content = { width: size.width, height: size.height };
    }
  } catch {
    /* 页面不可脚本化 */
  }

  let outer: WindowSize | null = null;
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId !== undefined) {
      const win = await browser.windows.get(tab.windowId);
      if (typeof win.width === 'number' && typeof win.height === 'number') {
        outer = { width: win.width, height: win.height };
      }
    }
  } catch {
    /* 忽略 */
  }

  const windowSize = content ?? { width: 1280, height: 800 };
  const chromeDelta = outer
    ? {
        width: Math.max(0, outer.width - windowSize.width),
        height: Math.max(0, outer.height - windowSize.height),
      }
    : { width: 0, height: 96 };
  return { windowSize, chromeDelta };
}

async function applySession(session: PreviewSession): Promise<void> {
  const device = findDevice(session.deviceId);
  const viewport = getOrientedViewport(device, session.orientation);
  const zoom = resolveZoom(viewport, session.windowSize, session.zoomMode, session.manualScale);
  const metrics = toEmulationMetrics(device, session.orientation, zoom);
  const safeArea = toSafeAreaOverride(device, session.orientation);
  await cdp.applyEmulation(session.tabId, metrics, safeArea);
}

async function notifyToolbar(tabId: number, session: PreviewSession): Promise<void> {
  const init = toolbarInit(session, session.windowSize);
  await browser.scripting.executeScript({
    target: { tabId },
    func: mountToolbar,
    args: [init],
  });
}

async function startPreview(tabId: number): Promise<void> {
  await loadCustomDevices();
  if (await getSession(tabId)) {
    await stopPreview(tabId);
    return;
  }
  const { windowSize, chromeDelta } = await measureWindow(tabId);
  let windowId: number | null = null;
  try {
    windowId = (await browser.tabs.get(tabId)).windowId ?? null;
  } catch {
    windowId = null;
  }
  const session: PreviewSession = {
    tabId,
    windowId,
    deviceId: SYSTEM_DEVICES[0]!.id,
    orientation: 'portrait',
    zoomMode: 'auto',
    manualScale: 0.6,
    windowSize,
    chromeDelta,
  };
  try {
    await cdp.attach(tabId);
  } catch (error) {
    const message =
      error instanceof DebuggerAttachError ? error.message : '无法启动预览，请稍后重试。';
    await mountErrorToolbar(tabId, message);
    return;
  }
  sessions.set(tabId, session);
  await persistSessions();
  try {
    await applySession(session);
    await notifyToolbar(tabId, session);
  } catch (error) {
    // 已附加但命令失败会留下「视口已改、工具条缺失」的页面，
    // 必须回滚到干净状态，而不是留一个用户退不出的预览。
    console.warn('[device-simulator] 应用模拟失败，已回滚', error);
    sessions.delete(tabId);
    await persistSessions();
    try {
      await cdp.clearEmulation(tabId);
    } catch {
      /* 忽略 */
    }
    await cdp.detach(tabId);
    await mountErrorToolbar(tabId, '无法在此页面应用设备模拟，请刷新页面后重试。');
  }
}

async function isAttached(tabId: number): Promise<boolean> {
  try {
    const targets = await browser.debugger.getTargets();
    return targets.some((target) => target.tabId === tabId && target.attached);
  } catch {
    return false;
  }
}

async function stopPreview(tabId: number): Promise<void> {
  const session = await getSession(tabId);
  sessions.delete(tabId);
  await persistSessions();
  if (session || (await isAttached(tabId))) {
    try {
      await cdp.clearEmulation(tabId);
    } catch {
      /* 标签页可能已关闭 */
    }
    await cdp.detach(tabId);
  }
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: () => document.getElementById('device-simulator-toolbar')?.remove(),
    });
  } catch {
    /* 页面已卸载 */
  }
}

async function mountErrorToolbar(tabId: number, text: string): Promise<void> {
  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: (message: string) => {
        const HOST_ID = 'device-simulator-toolbar';
        document.getElementById(HOST_ID)?.remove();
        const host = document.createElement('div');
        host.id = HOST_ID;
        host.style.cssText =
          'all:initial;position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;';
        const shadow = host.attachShadow({ mode: 'closed' });
        const box = document.createElement('div');
        box.style.cssText =
          'display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;' +
          'background:#111;color:#fff;font:500 12px/1.45 Inter,system-ui,sans-serif;' +
          'box-shadow:0 6px 20px rgba(0,0,0,.18);max-width:420px;';
        const label = document.createElement('span');
        label.textContent = message;
        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '关闭';
        close.style.cssText =
          'all:unset;cursor:pointer;color:#FF5500;font:inherit;padding:2px 4px;border-radius:4px;';
        close.addEventListener('click', () => host.remove());
        box.append(label, close);
        shadow.append(box);
        document.documentElement.appendChild(host);
      },
      args: [text],
    });
  } catch {
    console.warn('[device-simulator]', text);
  }
}

const pending = new Map<number, Promise<void>>();

/** 同一标签页的更新串行执行，避免快速连点造成 CDP 命令乱序。 */
function queueUpdate(tabId: number, task: () => Promise<void>): Promise<void> {
  const previous = pending.get(tabId) ?? Promise.resolve();
  const next = previous.then(task).catch((error: unknown) => {
    console.warn('[device-simulator] update failed', error);
  });
  pending.set(tabId, next);
  void next.finally(() => {
    if (pending.get(tabId) === next) pending.delete(tabId);
  });
  return next;
}

async function stepZoom(tabId: number, direction: -1 | 1): Promise<void> {
  const session = await getSession(tabId);
  if (!session) return;
  const device = findDevice(session.deviceId);
  const viewport = getOrientedViewport(device, session.orientation);
  const current = resolveZoom(viewport, session.windowSize, session.zoomMode, session.manualScale);
  session.zoomMode = 'manual';
  session.manualScale = Math.round(clampManualScale(current + direction * 0.1) * 100) / 100;
  await applySession(session);
  await notifyToolbar(tabId, session);
}

async function updateSession(
  tabId: number,
  mutate: (session: PreviewSession) => void,
): Promise<void> {
  const session = await getSession(tabId);
  if (!session) return;
  mutate(session);
  await persistSessions();
  await applySession(session);
  await notifyToolbar(tabId, session);
}

export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return;
    void startPreview(tab.id).catch((error: unknown) =>
      console.warn('[device-simulator] start failed', error),
    );
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    const data = message as
      { source?: string; type?: string; payload?: Record<string, unknown> } | undefined;
    if (data?.source !== 'device-simulator-toolbar') return;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return;

    switch (data.type) {
      case 'EXIT':
        void stopPreview(tabId);
        break;
      case 'SELECT_DEVICE': {
        const rawDeviceId = data.payload?.['deviceId'];
        const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId : '';
        if (allDevices().some((device) => device.id === deviceId)) {
          void queueUpdate(tabId, () =>
            updateSession(tabId, (session) => {
              session.deviceId = deviceId;
            }),
          );
        }
        break;
      }
      case 'TOGGLE_ORIENTATION':
        void queueUpdate(tabId, () =>
          updateSession(tabId, (session) => {
            session.orientation = session.orientation === 'portrait' ? 'landscape' : 'portrait';
          }),
        );
        break;
      case 'STEP_ZOOM': {
        const direction = Number(data.payload?.direction) === -1 ? -1 : 1;
        void queueUpdate(tabId, () => stepZoom(tabId, direction));
        break;
      }
      case 'AUTO_ZOOM':
        void queueUpdate(tabId, () =>
          updateSession(tabId, (session) => {
            session.zoomMode = 'auto';
          }),
        );
        break;
      default:
        break;
    }
    return undefined;
  });

  browser.windows.onBoundsChanged.addListener((win) => {
    if (win.id === undefined || win.width === undefined || win.height === undefined) return;
    for (const session of sessions.values()) {
      if (session.windowId !== win.id) continue;
      session.windowSize = {
        width: Math.max(1, win.width - session.chromeDelta.width),
        height: Math.max(1, win.height - session.chromeDelta.height),
      };
      void queueUpdate(session.tabId, () =>
        updateSession(session.tabId, () => {
          /* 尺寸已在上面更新，这里只需重算并下发 */
        }),
      );
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    sessions.delete(tabId);
    void persistSessions();
  });

  browser.debugger.onDetach.addListener((source) => {
    if (source.tabId === undefined) return;
    const tabId = source.tabId;
    sessions.delete(tabId);
    void persistSessions();
    // 调试器被外部接管（例如用户打开了 DevTools）后，工具条按钮已无意义。
    void browser.scripting
      .executeScript({
        target: { tabId },
        func: () => document.getElementById('device-simulator-toolbar')?.remove(),
      })
      .catch(() => undefined);
  });
});
