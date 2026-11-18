import { browser } from 'wxt/browser';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { mountOverlay, type OverlayDevice, type OverlayInit } from '../services/overlay-inject';
import type { DeviceProfile, DeviceViewport } from '../types/device';
import { maskStyle } from '../utils/mask-style';
import { toMaskShapes } from '../utils/viewport-transform';

/** 覆盖层自包含，background 只做一次性注入，因此无需保存任何会话状态。 */
async function loadCustomDevices(): Promise<DeviceProfile[]> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEYS.devices);
    const raw = stored[STORAGE_KEYS.devices] as { data?: { customDevices?: unknown } } | undefined;
    const list = raw?.data?.customDevices;
    if (!Array.isArray(list)) return [];
    return list.filter(isStoredDevice);
  } catch {
    return [];
  }
}

function isStoredDevice(value: unknown): value is DeviceProfile {
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

function toOverlayViewport(viewport: DeviceViewport): OverlayDevice['portrait'] {
  return {
    width: viewport.width,
    height: viewport.height,
    screenRadius: viewport.screenRadius ?? 36,
    masks: toMaskShapes(viewport).map(maskStyle),
  };
}

function toOverlayDevice(device: DeviceProfile): OverlayDevice {
  return {
    id: device.id,
    name: device.name,
    portrait: toOverlayViewport(device.portrait),
    landscape: toOverlayViewport(device.landscape),
  };
}

function isPreviewable(url: string | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

async function injectOverlay(tabId: number, targetUrl: string): Promise<void> {
  const customDevices = await loadCustomDevices();
  const devices = [...SYSTEM_DEVICES, ...customDevices].map(toOverlayDevice);
  const first = devices[0];
  if (!first) return;

  const init: OverlayInit = {
    targetUrl,
    devices,
    currentDeviceId: first.id,
    orientation: 'portrait',
    zoomMode: 'auto',
    manualScale: 0.6,
  };

  try {
    await browser.scripting.executeScript({
      target: { tabId },
      func: mountOverlay,
      args: [init],
    });
  } catch (error) {
    // chrome:// 等页面无法注入脚本，只能记录；用户会看到浏览器自身的限制。
    console.warn('[device-simulator] 无法在此页面注入覆盖层', error);
  }
}

export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    if (tab.id === undefined) return;
    if (!isPreviewable(tab.url)) {
      console.warn('[device-simulator] 此页面不支持预览');
      return;
    }
    void injectOverlay(tab.id, tab.url);
  });

  // 独立入口：在新标签页打开地址后请求注入。
  browser.runtime.onMessage.addListener((message: unknown) => {
    const data = message as { source?: string; type?: string; tabId?: number } | undefined;
    if (data?.source !== 'device-simulator' || data.type !== 'START') return undefined;
    if (typeof data.tabId !== 'number') return undefined;

    const tabId = data.tabId;
    void (async () => {
      // 新标签页需要时间完成首次加载，轮询到拿到 URL 再注入。
      for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
          const tab = await browser.tabs.get(tabId);
          if (isPreviewable(tab.url) && tab.status === 'complete') {
            await injectOverlay(tabId, tab.url);
            return;
          }
        } catch {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    })();
    return undefined;
  });
});
