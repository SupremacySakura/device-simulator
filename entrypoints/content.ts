import { browser } from 'wxt/browser';
import { COMPARE_FRAME_PORT_NAME } from '../services/compare-runtime-service';
import type { CompareRuntimeMessage } from '../types/compare-message';
import {
  calculateScrollPosition,
  isCompareRuntimeMessage,
  isControlledComparePageUrl,
  parseCompareIframeName,
} from '../utils/compare-message';
import { calculateScrollProgress } from '../utils/scroll-progress';
import { isExtensionMessage } from '../utils/message';
import { tryNormalizeUrl } from '../utils/url';

function setupCompareFrameBridge(): void {
  if (window === window.top || !isControlledComparePageUrl(window.location.href)) return;
  const identity = parseCompareIframeName(window.name);
  if (!identity) return;

  type FramePort = ReturnType<typeof browser.runtime.connect>;
  let port: FramePort | null = null;
  let reconnectTimer: number | null = null;
  let disposed = false;
  let scrollFrame: number | null = null;
  let remoteReleaseTimer: number | null = null;
  let navigationTimer: number | null = null;
  let loadReadyTimer: number | null = null;
  let applyingRemoteScroll = false;
  let lastAppliedSyncToken: string | null = null;
  let lastUrl = window.location.href;

  const post = (message: CompareRuntimeMessage) => {
    if (disposed || !port || !isCompareRuntimeMessage(message)) return;
    try {
      port.postMessage(message);
    } catch {
      // The page may be navigating and the frame port may already be gone.
    }
  };

  const metrics = () => {
    const root = document.scrollingElement ?? document.documentElement;
    return {
      scrollTop: Math.max(window.scrollY, root.scrollTop),
      scrollLeft: Math.max(window.scrollX, root.scrollLeft),
      scrollHeight: root.scrollHeight,
      scrollWidth: root.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    };
  };

  const releaseRemoteScroll = () => {
    if (remoteReleaseTimer !== null) window.clearTimeout(remoteReleaseTimer);
    remoteReleaseTimer = window.setTimeout(() => {
      applyingRemoteScroll = false;
      remoteReleaseTimer = null;
    }, 120);
  };

  const handleScroll = () => {
    if (applyingRemoteScroll) {
      releaseRemoteScroll();
      return;
    }
    if (scrollFrame !== null || document.visibilityState === 'hidden') return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      const progress = calculateScrollProgress(metrics());
      post({
        source: 'device-simulator-compare',
        type: 'COMPARE_SCROLL_EVENT',
        payload: { ...identity, ...progress, syncToken: crypto.randomUUID() },
      });
    });
  };

  const checkNavigation = () => {
    if (document.visibilityState === 'hidden' || window.location.href === lastUrl) return;
    lastUrl = window.location.href;
    if (!isControlledComparePageUrl(lastUrl)) return;
    post({
      source: 'device-simulator-compare',
      type: 'COMPARE_NAVIGATION_EVENT',
      payload: { ...identity, url: lastUrl },
    });
  };

  const handleRuntimeMessage = (value: unknown) => {
    if (!isCompareRuntimeMessage(value) || !('instanceId' in value.payload)) return;
    if (
      value.payload.sessionId !== identity.sessionId ||
      value.payload.instanceId !== identity.instanceId ||
      value.payload.bridgeToken !== identity.bridgeToken
    ) {
      return;
    }
    if (value.type === 'COMPARE_APPLY_SCROLL') {
      if (value.payload.syncToken === lastAppliedSyncToken) return;
      lastAppliedSyncToken = value.payload.syncToken;
      applyingRemoteScroll = true;
      const position = calculateScrollPosition(value.payload, metrics());
      window.scrollTo(position.left, position.top);
      releaseRemoteScroll();
      return;
    }
    if (value.type === 'COMPARE_APPLY_NAVIGATION') {
      const normalized = tryNormalizeUrl(value.payload.url);
      if (!normalized.success || !isControlledComparePageUrl(normalized.url)) return;
      if (normalized.url !== window.location.href) window.location.assign(normalized.url);
    }
  };

  const postReady = () =>
    post({
      source: 'device-simulator-compare',
      type: 'COMPARE_FRAME_READY',
      payload: {
        ...identity,
        url: window.location.href,
        capability: { scroll: true, navigation: true, reason: 'bridge-ready' },
      },
    });

  const connectPort = () => {
    if (disposed || port) return;
    let nextPort: FramePort;
    try {
      nextPort = browser.runtime.connect({ name: COMPARE_FRAME_PORT_NAME });
    } catch {
      scheduleReconnect();
      return;
    }
    port = nextPort;
    nextPort.onMessage.addListener(handleRuntimeMessage);
    nextPort.onDisconnect.addListener(() => {
      if (port !== nextPort || disposed) return;
      nextPort.onMessage.removeListener(handleRuntimeMessage);
      port = null;
      scheduleReconnect();
    });
    postReady();
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer !== null) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connectPort();
    }, 250);
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    window.removeEventListener('scroll', handleScroll);
    window.removeEventListener('hashchange', checkNavigation);
    window.removeEventListener('popstate', checkNavigation);
    window.removeEventListener('load', handleWindowLoad);
    window.removeEventListener('pagehide', handlePageHide);
    window.removeEventListener('pageshow', handlePageShow);
    const activePort = port;
    port = null;
    activePort?.onMessage.removeListener(handleRuntimeMessage);
    if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
    if (remoteReleaseTimer !== null) window.clearTimeout(remoteReleaseTimer);
    if (navigationTimer !== null) window.clearInterval(navigationTimer);
    if (loadReadyTimer !== null) window.clearTimeout(loadReadyTimer);
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    activePort?.disconnect();
  };
  const handlePageHide = (event: PageTransitionEvent) => {
    if (!event.persisted) {
      cleanup();
      return;
    }
    const activePort = port;
    port = null;
    activePort?.onMessage.removeListener(handleRuntimeMessage);
    activePort?.disconnect();
    if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) connectPort();
  };
  const handleWindowLoad = () => {
    loadReadyTimer = window.setTimeout(() => {
      loadReadyTimer = null;
      postReady();
    }, 0);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('hashchange', checkNavigation);
  window.addEventListener('popstate', checkNavigation);
  window.addEventListener('load', handleWindowLoad, { once: true });
  window.addEventListener('pagehide', handlePageHide);
  window.addEventListener('pageshow', handlePageShow);
  navigationTimer = window.setInterval(checkNavigation, 250);
  connectPort();
}

export default defineContentScript({
  matches: [
    'http://localhost/*',
    'https://localhost/*',
    'http://*.localhost/*',
    'https://*.localhost/*',
    'http://127.0.0.1/*',
    'https://127.0.0.1/*',
  ],
  allFrames: true,
  runAt: 'document_start',
  main() {
    document.documentElement.dataset.deviceSimulatorBridge = 'ready';

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isExtensionMessage(message)) return;
      if (message.type === 'PING') return;
      if (message.type === 'SET_DEVICE_CONTEXT') {
        document.documentElement.dataset.deviceSimulatorOrientation = message.payload.orientation;
        return;
      }
      if (message.type === 'SET_SAFE_AREA') {
        const root = document.documentElement.style;
        root.setProperty('--device-safe-area-top', `${message.payload.top}px`);
        root.setProperty('--device-safe-area-right', `${message.payload.right}px`);
        root.setProperty('--device-safe-area-bottom', `${message.payload.bottom}px`);
        root.setProperty('--device-safe-area-left', `${message.payload.left}px`);
        return;
      }
    });

    setupCompareFrameBridge();
  },
});
