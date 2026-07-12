import { browser } from 'wxt/browser';
import type { DeviceOrientation, DeviceProfile, SafeAreaInsets } from '../types/device';
import type { ExtensionMessage } from '../types/message';
import { buildSimulatorSearch } from '../utils/simulator-launch';

export interface ActiveTabInfo {
  id: number;
  title: string;
  url: string;
  simulatable: boolean;
}

function isWebUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id === undefined || !tab.url) return null;
    return {
      id: tab.id,
      title: tab.title?.trim() || '当前页面',
      url: tab.url,
      simulatable: isWebUrl(tab.url),
    };
  } catch (error) {
    console.warn('[tabs] Unable to read the active tab', error);
    return null;
  }
}

function mountSimulatorOverlay(
  simulatorUrl: string,
  extensionOrigins: string[],
  sessionId: string,
): void {
  const hostId = 'device-simulator-in-page-overlay';
  const existing = document.getElementById(hostId);
  if (existing) {
    const existingCloseButton = existing.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (existingCloseButton) existingCloseButton.click();
    if (existing.isConnected) existing.remove();
  }

  const parentOrigin = window.location.origin;
  if (!/^https?:\/\//.test(parentOrigin)) {
    throw new Error('Device Simulator 只能注入 HTTP(S) 页面。');
  }
  const embeddedUrl = new URL(simulatorUrl);
  embeddedUrl.searchParams.set('parentOrigin', parentOrigin);

  const host = document.createElement('div');
  host.id = hostId;
  host.setAttribute('aria-label', 'Device Simulator 页面覆盖层');
  host.style.setProperty('all', 'initial', 'important');
  host.style.setProperty('position', 'fixed', 'important');
  host.style.setProperty('inset', '0', 'important');
  host.style.setProperty('width', '100vw', 'important');
  host.style.setProperty('height', '100vh', 'important');
  host.style.setProperty('z-index', '2147483647', 'important');
  host.style.setProperty('display', 'block', 'important');
  host.style.setProperty('background', '#f6f6f8', 'important');

  const shadow = host.attachShadow({ mode: 'open' });
  const frame = document.createElement('iframe');
  frame.title = 'Device Simulator';
  frame.src = embeddedUrl.href;
  frame.allow = 'clipboard-read; clipboard-write; fullscreen';
  frame.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;border:0;background:#f6f6f8;color-scheme:light;';
  shadow.append(frame);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '×';
  closeButton.title = '退出页面内模拟器';
  closeButton.setAttribute('aria-label', '退出页面内模拟器');
  closeButton.style.cssText =
    'all:initial;position:absolute;z-index:2;top:14px;right:14px;width:34px;height:34px;display:grid;place-items:center;box-sizing:border-box;border:1px solid transparent;border-radius:8px;background:#fff;color:#33343b;font:24px/1 system-ui,sans-serif;cursor:pointer;';
  shadow.append(closeButton);

  const previousHtmlOverflow = document.documentElement.style.overflow;
  const previousBodyOverflow = document.body?.style.overflow ?? '';
  document.documentElement.style.setProperty('overflow', 'hidden', 'important');
  document.body?.style.setProperty('overflow', 'hidden', 'important');

  const remove = () => {
    window.removeEventListener('message', handleMessage);
    window.removeEventListener('keydown', handleKeyDown, true);
    host.remove();
    document.documentElement.style.overflow = previousHtmlOverflow;
    if (document.body) document.body.style.overflow = previousBodyOverflow;
  };
  const handleMessage = (event: MessageEvent) => {
    if (!extensionOrigins.includes(event.origin) || event.source !== frame.contentWindow) return;
    const data: unknown = event.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      Reflect.get(data, 'source') === 'device-simulator' &&
      Reflect.get(data, 'type') === 'CLOSE_IN_PAGE_SIMULATOR' &&
      Reflect.get(data, 'sessionId') === sessionId
    ) {
      remove();
    }
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') remove();
  };

  closeButton.addEventListener('click', remove);
  window.addEventListener('message', handleMessage);
  window.addEventListener('keydown', handleKeyDown, true);
  document.documentElement.append(host);
}

export async function openSimulatorInCurrentTab(options: {
  tabId: number;
  url: string;
  deviceId?: string;
}): Promise<void> {
  const sessionId = crypto.randomUUID();
  const query = buildSimulatorSearch({
    url: options.url,
    embedded: true,
    sessionId,
    ...(options.deviceId ? { deviceId: options.deviceId } : {}),
  });
  const simulatorBaseUrl = browser.runtime.getURL('/simulator.html');
  const simulatorUrl = `${simulatorBaseUrl}?${query}`;
  // Dynamic web-accessible URLs can use a per-session host while the loaded
  // document still has the extension's canonical origin.
  const extensionOrigins = Array.from(
    new Set([new URL(browser.runtime.getURL('/')).origin, new URL(simulatorBaseUrl).origin]),
  );

  try {
    await browser.scripting.executeScript({
      target: { tabId: options.tabId },
      func: mountSimulatorOverlay,
      args: [simulatorUrl, extensionOrigins, sessionId],
    });
  } catch (error) {
    throw new Error('无法在当前页面中启动模拟器。请确认该页面允许扩展注入。', { cause: error });
  }
}

export async function openSimulator(
  options: { url?: string; deviceId?: string; blank?: boolean } = {},
): Promise<void> {
  const query = buildSimulatorSearch(options);
  const suffix = query ? `?${query}` : '';
  await browser.tabs.create({ url: `${browser.runtime.getURL('/simulator.html')}${suffix}` });
}

export async function sendDeviceContext(
  device: DeviceProfile,
  orientation: DeviceOrientation,
): Promise<void> {
  const message: ExtensionMessage = {
    type: 'SET_DEVICE_CONTEXT',
    payload: { device, orientation },
  };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // The content bridge is optional in the MVP; no receiver is a valid state.
  }
}

export async function sendSafeArea(safeArea: SafeAreaInsets): Promise<void> {
  const message: ExtensionMessage = { type: 'SET_SAFE_AREA', payload: safeArea };
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // The content bridge is optional in the MVP; no receiver is a valid state.
  }
}
