import { browser } from 'wxt/browser';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import { createCdpClient, DebuggerAttachError } from '../services/cdp-service';
import { mountToolbar, type ToolbarInit } from '../services/toolbar-inject';
import type { DeviceOrientation } from '../types/device';
import { clampManualScale } from '../utils/device-scale';
import {
  getOrientedViewport,
  resolveZoom,
  toEmulationMetrics,
  toSafeAreaOverride,
} from '../utils/viewport-transform';

interface PreviewSession {
  tabId: number;
  deviceId: string;
  orientation: DeviceOrientation;
  zoomMode: 'auto' | 'manual';
  manualScale: number;
}

const sessions = new Map<number, PreviewSession>();

const cdp = createCdpClient({
  attach: (target, version) => browser.debugger.attach(target, version),
  detach: (target) => browser.debugger.detach(target),
  sendCommand: (target, method, params) =>
    browser.debugger.sendCommand(target, method, params ?? {}),
});

function findDevice(deviceId: string) {
  return SYSTEM_DEVICES.find((device) => device.id === deviceId) ?? SYSTEM_DEVICES[0]!;
}

function toolbarInit(
  session: PreviewSession,
  windowSize: { width: number; height: number },
): ToolbarInit {
  const device = findDevice(session.deviceId);
  const viewport = getOrientedViewport(device, session.orientation);
  const zoom = resolveZoom(viewport, windowSize, session.zoomMode, session.manualScale);
  return {
    devices: SYSTEM_DEVICES.map(({ id, name }) => ({ id, name })),
    currentDeviceId: device.id,
    orientation: session.orientation,
    zoomPercent: Math.round(zoom * 100),
    autoZoom: session.zoomMode === 'auto',
  };
}

async function readWindowSize(tabId: number): Promise<{ width: number; height: number }> {
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab.windowId !== undefined) {
      const win = await browser.windows.get(tab.windowId);
      if (typeof win.width === 'number' && typeof win.height === 'number') {
        return { width: win.width, height: win.height };
      }
    }
  } catch {
    /* 窗口信息不可用时回落到保守值 */
  }
  return { width: 1280, height: 800 };
}

async function applySession(session: PreviewSession): Promise<void> {
  const device = findDevice(session.deviceId);
  const viewport = getOrientedViewport(device, session.orientation);
  const windowSize = await readWindowSize(session.tabId);
  const zoom = resolveZoom(viewport, windowSize, session.zoomMode, session.manualScale);
  const metrics = toEmulationMetrics(device, session.orientation, zoom);
  const safeArea = toSafeAreaOverride(device, session.orientation);
  await cdp.applyEmulation(session.tabId, metrics, safeArea);
}

async function notifyToolbar(tabId: number, session: PreviewSession): Promise<void> {
  const init = toolbarInit(session, await readWindowSize(tabId));
  await browser.scripting.executeScript({
    target: { tabId },
    func: mountToolbar,
    args: [init],
  });
}

async function startPreview(tabId: number): Promise<void> {
  if (sessions.has(tabId)) {
    await stopPreview(tabId);
    return;
  }
  const session: PreviewSession = {
    tabId,
    deviceId: SYSTEM_DEVICES[0]!.id,
    orientation: 'portrait',
    zoomMode: 'auto',
    manualScale: 0.6,
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
  await applySession(session);
  await notifyToolbar(tabId, session);
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
  const session = sessions.get(tabId);
  sessions.delete(tabId);
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

async function updateSession(
  tabId: number,
  mutate: (session: PreviewSession) => void,
): Promise<void> {
  const session = sessions.get(tabId);
  if (!session) return;
  mutate(session);
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
        if (SYSTEM_DEVICES.some((device) => device.id === deviceId)) {
          void updateSession(tabId, (session) => {
            session.deviceId = deviceId;
          });
        }
        break;
      }
      case 'TOGGLE_ORIENTATION':
        void updateSession(tabId, (session) => {
          session.orientation = session.orientation === 'portrait' ? 'landscape' : 'portrait';
        });
        break;
      case 'STEP_ZOOM': {
        const direction = Number(data.payload?.direction) === -1 ? -1 : 1;
        void updateSession(tabId, (session) => {
          const device = findDevice(session.deviceId);
          const viewport = getOrientedViewport(device, session.orientation);
          const current =
            session.zoomMode === 'auto'
              ? resolveZoom(viewport, { width: 1280, height: 800 }, 'auto', session.manualScale)
              : session.manualScale;
          session.zoomMode = 'manual';
          session.manualScale = Math.round(clampManualScale(current + direction * 0.1) * 100) / 100;
        });
        break;
      }
      case 'AUTO_ZOOM':
        void updateSession(tabId, (session) => {
          session.zoomMode = 'auto';
        });
        break;
      default:
        break;
    }
    return undefined;
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    sessions.delete(tabId);
  });

  browser.debugger.onDetach.addListener((source) => {
    if (source.tabId !== undefined) sessions.delete(source.tabId);
  });
});
