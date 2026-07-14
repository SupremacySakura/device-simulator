import { browser } from 'wxt/browser';
import type {
  CompareBridgeIdentity,
  CompareRuntimeEvent,
  CompareRuntimeMessage,
  CompareScrollProgress,
  CompareSyncCapability,
} from '../types/compare-message';
import {
  calculateScrollPosition,
  createCompareIframeName,
  isCompareRuntimeMessage,
  isControlledComparePageUrl,
} from '../utils/compare-message';
import { isBundledCompareDemoUrl } from '../utils/compare-url';
import { calculateScrollProgress } from '../utils/scroll-progress';
import { tryNormalizeUrl } from '../utils/url';

export const COMPARE_WORKSPACE_PORT_NAME = 'device-simulator:compare-workspace:v1';
export const COMPARE_FRAME_PORT_NAME = 'device-simulator:compare-frame:v1';

type RuntimePort = ReturnType<typeof browser.runtime.connect>;
type RuntimeListener = (event: CompareRuntimeEvent) => void;

interface RuntimeInstance {
  identity: CompareBridgeIdentity;
  binding: CompareIframeBinding;
  iframe: HTMLIFrameElement | null;
  iframeLoadCleanup: (() => void) | null;
  directCleanup: (() => void) | null;
  capabilityTimer: number | null;
  directWindow: Window | null;
  directApplyScroll: ((progress: CompareScrollProgress, syncToken: string) => void) | null;
  directApplyNavigation: ((url: string) => void) | null;
  capability: CompareSyncCapability | null;
  lastObservedUrl: string | null;
}

interface RouterRegistration {
  identity: CompareBridgeIdentity;
  port: RuntimePort;
  tabId: number;
}

interface RouterFrame {
  identity: CompareBridgeIdentity;
  port: RuntimePort;
  tabId: number;
  url: string;
}

export interface CompareIframeBinding {
  bridgeToken: string;
  iframeName: string;
  iframeRef: (iframe: HTMLIFrameElement | null) => void;
}

export interface CompareRuntimeService {
  sessionId: string;
  registerInstance: (instanceId: string) => CompareIframeBinding;
  unregisterInstance: (instanceId: string) => void;
  subscribe: (listener: RuntimeListener) => () => void;
  applyScroll: (
    instanceId: string,
    progress: CompareScrollProgress,
    syncToken?: string,
  ) => string | null;
  applyNavigation: (instanceId: string, url: string) => boolean;
  dispose: () => void;
}

function sameIdentity(left: CompareBridgeIdentity, right: CompareBridgeIdentity): boolean {
  return (
    left.sessionId === right.sessionId &&
    left.instanceId === right.instanceId &&
    left.bridgeToken === right.bridgeToken
  );
}

function routerKey(tabId: number, identity: CompareBridgeIdentity): string {
  return `${tabId}:${identity.sessionId}:${identity.instanceId}:${identity.bridgeToken}`;
}

function safePost(port: RuntimePort, message: CompareRuntimeMessage): boolean {
  try {
    port.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

function capabilityMessage(
  identity: CompareBridgeIdentity,
  scroll: boolean,
  navigation: boolean,
  reason: 'bridge-ready' | 'bridge-disconnected' | 'unsupported-url',
): CompareRuntimeMessage {
  return {
    source: 'device-simulator-compare',
    type: 'COMPARE_INSTANCE_CAPABILITY',
    payload: { ...identity, capability: { scroll, navigation, reason } },
  };
}

function isSimulatorWorkspacePort(port: RuntimePort): boolean {
  const sender = port.sender;
  if (!sender || sender.id !== browser.runtime.id || sender.tab?.id === undefined) return false;
  try {
    return new URL(sender.url ?? '').pathname.endsWith('/simulator.html');
  } catch {
    return false;
  }
}

function isControlledFramePort(port: RuntimePort): boolean {
  const sender = port.sender;
  return (
    sender !== undefined &&
    sender.id === browser.runtime.id &&
    sender.tab?.id !== undefined &&
    typeof sender.frameId === 'number' &&
    sender.frameId > 0 &&
    isControlledComparePageUrl(sender.url ?? '')
  );
}

let routerInstalled = false;

/** Installs the background-only router for compare workspace and controlled frame ports. */
export function installCompareRuntimeRouter(): void {
  if (routerInstalled) return;
  routerInstalled = true;

  const registrations = new Map<string, RouterRegistration>();
  const frames = new Map<string, RouterFrame>();
  const lastFrameUrlByKey = new Map<string, string>();
  const registrationKeysByPort = new Map<RuntimePort, Set<string>>();
  const frameKeysByPort = new Map<RuntimePort, Set<string>>();

  const notifyReady = (key: string) => {
    const registration = registrations.get(key);
    const frame = frames.get(key);
    if (!registration || !frame || !sameIdentity(registration.identity, frame.identity)) return;
    safePost(
      registration.port,
      capabilityMessage(registration.identity, true, true, 'bridge-ready'),
    );
  };

  browser.runtime.onConnect.addListener((port) => {
    if (port.name === COMPARE_WORKSPACE_PORT_NAME) {
      if (!isSimulatorWorkspacePort(port)) {
        port.disconnect();
        return;
      }
      const tabId = port.sender?.tab?.id;
      if (tabId === undefined) {
        port.disconnect();
        return;
      }
      const keys = new Set<string>();
      registrationKeysByPort.set(port, keys);

      port.onMessage.addListener((value: unknown) => {
        if (!isCompareRuntimeMessage(value)) return;
        const identity = value.payload;
        const key = routerKey(tabId, identity);
        if (value.type === 'COMPARE_REGISTER_INSTANCE') {
          registrations.set(key, { identity, port, tabId });
          keys.add(key);
          notifyReady(key);
          return;
        }
        const registration = registrations.get(key);
        if (!registration || registration.port !== port) return;
        if (value.type === 'COMPARE_UNREGISTER_INSTANCE') {
          registrations.delete(key);
          keys.delete(key);
          lastFrameUrlByKey.delete(key);
          return;
        }
        if (value.type === 'COMPARE_APPLY_SCROLL' || value.type === 'COMPARE_APPLY_NAVIGATION') {
          const frame = frames.get(key);
          if (frame && sameIdentity(frame.identity, identity)) safePost(frame.port, value);
        }
      });

      port.onDisconnect.addListener(() => {
        for (const key of keys) {
          const registration = registrations.get(key);
          if (registration?.port === port) registrations.delete(key);
          if (!frames.has(key)) lastFrameUrlByKey.delete(key);
        }
        registrationKeysByPort.delete(port);
      });
      return;
    }

    if (port.name !== COMPARE_FRAME_PORT_NAME) return;
    if (!isControlledFramePort(port)) {
      port.disconnect();
      return;
    }
    const tabId = port.sender?.tab?.id;
    if (tabId === undefined) {
      port.disconnect();
      return;
    }
    const senderUrl = port.sender?.url ?? '';
    const keys = new Set<string>();
    frameKeysByPort.set(port, keys);

    port.onMessage.addListener((value: unknown) => {
      if (!isCompareRuntimeMessage(value)) return;
      const identity = value.payload;
      const key = routerKey(tabId, identity);
      if (value.type === 'COMPARE_FRAME_READY') {
        if (
          !isControlledComparePageUrl(value.payload.url) ||
          !isControlledComparePageUrl(senderUrl)
        ) {
          return;
        }
        const previousUrl = lastFrameUrlByKey.get(key);
        const previous = frames.get(key);
        frames.set(key, { identity, port, tabId, url: value.payload.url });
        lastFrameUrlByKey.set(key, value.payload.url);
        keys.add(key);
        if (previous && previous.port !== port) previous.port.disconnect();
        notifyReady(key);
        const registration = registrations.get(key);
        if (registration && previousUrl && previousUrl !== value.payload.url) {
          safePost(registration.port, {
            source: 'device-simulator-compare',
            type: 'COMPARE_NAVIGATION_EVENT',
            payload: { ...identity, url: value.payload.url },
          });
        }
        return;
      }
      const frame = frames.get(key);
      if (!frame || frame.port !== port || !sameIdentity(frame.identity, identity)) return;
      if (value.type === 'COMPARE_SCROLL_EVENT' || value.type === 'COMPARE_NAVIGATION_EVENT') {
        if (
          value.type === 'COMPARE_NAVIGATION_EVENT' &&
          !isControlledComparePageUrl(value.payload.url)
        ) {
          return;
        }
        if (value.type === 'COMPARE_NAVIGATION_EVENT') {
          lastFrameUrlByKey.set(key, value.payload.url);
        }
        const registration = registrations.get(key);
        if (registration && sameIdentity(registration.identity, identity)) {
          safePost(registration.port, value);
        }
      }
    });

    port.onDisconnect.addListener(() => {
      for (const key of keys) {
        const frame = frames.get(key);
        if (frame?.port !== port) continue;
        frames.delete(key);
        const registration = registrations.get(key);
        if (registration) {
          safePost(
            registration.port,
            capabilityMessage(registration.identity, false, false, 'bridge-disconnected'),
          );
        } else {
          lastFrameUrlByKey.delete(key);
        }
      }
      frameKeysByPort.delete(port);
    });
  });
}

function documentScrollMetrics(targetWindow: Window) {
  const root = targetWindow.document.scrollingElement ?? targetWindow.document.documentElement;
  return {
    scrollTop: Math.max(targetWindow.scrollY, root.scrollTop),
    scrollLeft: Math.max(targetWindow.scrollX, root.scrollLeft),
    scrollHeight: root.scrollHeight,
    scrollWidth: root.scrollWidth,
    viewportHeight: targetWindow.innerHeight,
    viewportWidth: targetWindow.innerWidth,
  };
}

function isExtensionDemoWindow(targetWindow: Window): boolean {
  try {
    return isBundledCompareDemoUrl(targetWindow.location.href);
  } catch {
    return false;
  }
}

function isExtensionDemoUrl(value: string): boolean {
  return isBundledCompareDemoUrl(value);
}

function normalizeDirectNavigationUrl(value: string): string | null {
  if (isBundledCompareDemoUrl(value)) return new URL(value).href;
  const normalized = tryNormalizeUrl(value);
  return normalized.success ? normalized.url : null;
}

export function createCompareRuntimeService(
  sessionId = crypto.randomUUID(),
): CompareRuntimeService {
  // This also validates a caller-supplied session ID before opening a runtime port.
  createCompareIframeName({
    sessionId,
    instanceId: 'validation-instance',
    bridgeToken: 'validation-token',
  });

  const instances = new Map<string, RuntimeInstance>();
  const listeners = new Set<RuntimeListener>();
  let port: RuntimePort | null = null;
  let reconnectTimer: number | null = null;
  let disposed = false;

  const emit = (event: CompareRuntimeEvent) => {
    for (const listener of listeners) listener(event);
  };

  const post = (message: CompareRuntimeMessage) =>
    !disposed && port !== null && safePost(port, message);

  const clearCapabilityTimer = (instance: RuntimeInstance) => {
    if (instance.capabilityTimer === null) return;
    window.clearTimeout(instance.capabilityTimer);
    instance.capabilityTimer = null;
  };

  const emitCapability = (instance: RuntimeInstance, capability: CompareSyncCapability) => {
    clearCapabilityTimer(instance);
    instance.capability = capability;
    emit({ type: 'capability', instanceId: instance.identity.instanceId, capability });
  };

  const clearDirectBridge = (instance: RuntimeInstance, notify = true) => {
    instance.directCleanup?.();
    instance.directCleanup = null;
    instance.directWindow = null;
    instance.directApplyScroll = null;
    instance.directApplyNavigation = null;
    if (notify) {
      emitCapability(instance, {
        scroll: false,
        navigation: false,
        reason: 'bridge-disconnected',
      });
    }
  };

  const attachDirectDemoBridge = (instance: RuntimeInstance): boolean => {
    clearDirectBridge(instance, false);
    if (instance.iframe?.name !== instance.binding.iframeName) return false;
    const iframeWindow = instance.iframe.contentWindow;
    if (!iframeWindow || !isExtensionDemoWindow(iframeWindow)) return false;

    let scrollFrame: number | null = null;
    let releaseTimer: number | null = null;
    let navigationTimer: number | null = null;
    let applyingRemoteScroll = false;
    let lastAppliedSyncToken: string | null = null;
    let lastUrl = iframeWindow.location.href;
    const previousUrl = instance.lastObservedUrl;
    instance.lastObservedUrl = lastUrl;

    const releaseRemoteScroll = () => {
      if (releaseTimer !== null) iframeWindow.clearTimeout(releaseTimer);
      releaseTimer = iframeWindow.setTimeout(() => {
        applyingRemoteScroll = false;
        releaseTimer = null;
      }, 120);
    };
    const handleScroll = () => {
      if (applyingRemoteScroll) {
        releaseRemoteScroll();
        return;
      }
      if (scrollFrame !== null) return;
      scrollFrame = iframeWindow.requestAnimationFrame(() => {
        scrollFrame = null;
        const metrics = documentScrollMetrics(iframeWindow);
        const progress = calculateScrollProgress(metrics);
        emit({
          type: 'scroll',
          instanceId: instance.identity.instanceId,
          syncToken: crypto.randomUUID(),
          ...progress,
        });
      });
    };
    const checkNavigation = () => {
      const nextUrl = iframeWindow.location.href;
      if (nextUrl === lastUrl) return;
      lastUrl = nextUrl;
      instance.lastObservedUrl = nextUrl;
      emit({ type: 'navigation', instanceId: instance.identity.instanceId, url: nextUrl });
    };

    iframeWindow.addEventListener('scroll', handleScroll, { passive: true });
    iframeWindow.addEventListener('hashchange', checkNavigation);
    iframeWindow.addEventListener('popstate', checkNavigation);
    navigationTimer = iframeWindow.setInterval(checkNavigation, 250);

    instance.directWindow = iframeWindow;
    instance.directApplyScroll = (progress, syncToken) => {
      if (syncToken === lastAppliedSyncToken) return;
      lastAppliedSyncToken = syncToken;
      applyingRemoteScroll = true;
      const metrics = documentScrollMetrics(iframeWindow);
      const position = calculateScrollPosition(progress, metrics);
      iframeWindow.scrollTo(position.left, position.top);
      releaseRemoteScroll();
    };
    instance.directApplyNavigation = (url) => iframeWindow.location.assign(url);
    instance.directCleanup = () => {
      iframeWindow.removeEventListener('scroll', handleScroll);
      iframeWindow.removeEventListener('hashchange', checkNavigation);
      iframeWindow.removeEventListener('popstate', checkNavigation);
      if (scrollFrame !== null) iframeWindow.cancelAnimationFrame(scrollFrame);
      if (releaseTimer !== null) iframeWindow.clearTimeout(releaseTimer);
      if (navigationTimer !== null) iframeWindow.clearInterval(navigationTimer);
    };
    emitCapability(instance, { scroll: true, navigation: true, reason: 'bridge-ready' });
    if (previousUrl && previousUrl !== lastUrl) {
      emit({ type: 'navigation', instanceId: instance.identity.instanceId, url: lastUrl });
    }
    return true;
  };

  const scheduleCapabilityTimeout = (instance: RuntimeInstance) => {
    clearCapabilityTimer(instance);
    instance.capabilityTimer = window.setTimeout(() => {
      instance.capabilityTimer = null;
      emitCapability(instance, {
        scroll: false,
        navigation: false,
        reason: 'bridge-timeout',
      });
    }, 2000);
  };

  const classifyLoadedIframe = (instance: RuntimeInstance) => {
    clearCapabilityTimer(instance);
    clearDirectBridge(instance, false);
    if (attachDirectDemoBridge(instance)) return;
    const requestedUrl = instance.iframe?.src ?? '';
    if (isControlledComparePageUrl(requestedUrl)) {
      scheduleCapabilityTimeout(instance);
      return;
    }
    emitCapability(instance, {
      scroll: false,
      navigation: false,
      reason: 'unsupported-url',
    });
  };

  const handlePortMessage = (value: unknown) => {
    if (!isCompareRuntimeMessage(value) || value.payload.sessionId !== sessionId) return;
    const instance = instances.get(value.payload.instanceId);
    if (!instance || !sameIdentity(instance.identity, value.payload)) return;
    if (value.type === 'COMPARE_INSTANCE_CAPABILITY') {
      emitCapability(instance, value.payload.capability);
    } else if (value.type === 'COMPARE_SCROLL_EVENT') {
      emit({
        type: 'scroll',
        instanceId: value.payload.instanceId,
        syncToken: value.payload.syncToken,
        verticalProgress: value.payload.verticalProgress,
        horizontalProgress: value.payload.horizontalProgress,
      });
    } else if (value.type === 'COMPARE_NAVIGATION_EVENT') {
      instance.lastObservedUrl = value.payload.url;
      emit({
        type: 'navigation',
        instanceId: value.payload.instanceId,
        url: value.payload.url,
      });
    }
  };

  const scheduleReconnect = () => {
    if (disposed || reconnectTimer !== null || listeners.size === 0) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, 250);
  };

  const connect = () => {
    if (disposed || port !== null) return;
    let nextPort: RuntimePort;
    try {
      nextPort = browser.runtime.connect({ name: COMPARE_WORKSPACE_PORT_NAME });
    } catch {
      scheduleReconnect();
      return;
    }
    port = nextPort;
    nextPort.onMessage.addListener(handlePortMessage);
    nextPort.onDisconnect.addListener(() => {
      if (port !== nextPort) return;
      port = null;
      if (disposed) return;
      for (const instance of instances.values()) {
        if (instance.directApplyScroll && instance.directApplyNavigation) continue;
        emitCapability(instance, {
          scroll: false,
          navigation: false,
          reason: 'bridge-disconnected',
        });
      }
      scheduleReconnect();
    });
    for (const instance of instances.values()) {
      post({
        source: 'device-simulator-compare',
        type: 'COMPARE_REGISTER_INSTANCE',
        payload: instance.identity,
      });
    }
  };

  const registerInstance = (instanceId: string): CompareIframeBinding => {
    const current = instances.get(instanceId);
    if (current) return current.binding;
    const identity: CompareBridgeIdentity = {
      sessionId,
      instanceId,
      bridgeToken: crypto.randomUUID(),
    };
    const iframeName = createCompareIframeName(identity);
    const binding: CompareIframeBinding = {
      bridgeToken: identity.bridgeToken,
      iframeName,
      iframeRef: (iframe) => {
        const instance = instances.get(instanceId);
        if (!instance) return;
        if (instance.iframe === iframe) return;
        instance.iframeLoadCleanup?.();
        instance.iframeLoadCleanup = null;
        if (instance.iframe) clearDirectBridge(instance);
        instance.iframe = iframe;
        clearCapabilityTimer(instance);
        if (!iframe) return;
        const handleLoad = () => classifyLoadedIframe(instance);
        iframe.addEventListener('load', handleLoad);
        instance.iframeLoadCleanup = () => iframe.removeEventListener('load', handleLoad);
        const requestedUrl = iframe.src;
        if (!isExtensionDemoUrl(requestedUrl) && !isControlledComparePageUrl(requestedUrl)) {
          emitCapability(instance, {
            scroll: false,
            navigation: false,
            reason: 'unsupported-url',
          });
        } else if (isControlledComparePageUrl(requestedUrl)) {
          scheduleCapabilityTimeout(instance);
        }
        if (isExtensionDemoUrl(requestedUrl)) {
          queueMicrotask(() => {
            if (instance.iframe === iframe) attachDirectDemoBridge(instance);
          });
        }
      },
    };
    const instance: RuntimeInstance = {
      identity,
      binding,
      iframe: null,
      iframeLoadCleanup: null,
      directCleanup: null,
      capabilityTimer: null,
      directWindow: null,
      directApplyScroll: null,
      directApplyNavigation: null,
      capability: null,
      lastObservedUrl: null,
    };
    instances.set(instanceId, instance);
    // Runtime connection is intentionally lazy so constructing this service in
    // React StrictMode does not leak a discarded port during the probe render.
    post({
      source: 'device-simulator-compare',
      type: 'COMPARE_REGISTER_INSTANCE',
      payload: identity,
    });
    return binding;
  };

  const unregisterInstance = (instanceId: string) => {
    const instance = instances.get(instanceId);
    if (!instance) return;
    post({
      source: 'device-simulator-compare',
      type: 'COMPARE_UNREGISTER_INSTANCE',
      payload: instance.identity,
    });
    instance.iframeLoadCleanup?.();
    clearCapabilityTimer(instance);
    clearDirectBridge(instance, false);
    instances.delete(instanceId);
  };

  return {
    sessionId,
    registerInstance,
    unregisterInstance,
    subscribe: (listener) => {
      listeners.add(listener);
      connect();
      for (const instance of instances.values()) {
        if (!instance.capability) continue;
        listener({
          type: 'capability',
          instanceId: instance.identity.instanceId,
          capability: instance.capability,
        });
      }
      return () => listeners.delete(listener);
    },
    applyScroll: (instanceId, progress, syncToken = crypto.randomUUID()) => {
      const instance = instances.get(instanceId);
      if (!instance) return null;
      if (instance.directApplyScroll) {
        instance.directApplyScroll(progress, syncToken);
        return syncToken;
      }
      connect();
      const message: CompareRuntimeMessage = {
        source: 'device-simulator-compare',
        type: 'COMPARE_APPLY_SCROLL',
        payload: { ...instance.identity, ...progress, syncToken },
      };
      return isCompareRuntimeMessage(message) && post(message) ? syncToken : null;
    },
    applyNavigation: (instanceId, url) => {
      const instance = instances.get(instanceId);
      if (!instance) return false;
      const normalized = normalizeDirectNavigationUrl(url);
      if (!normalized) return false;
      if (instance.directApplyNavigation) {
        instance.directApplyNavigation(normalized);
        return true;
      }
      connect();
      const message: CompareRuntimeMessage = {
        source: 'device-simulator-compare',
        type: 'COMPARE_APPLY_NAVIGATION',
        payload: { ...instance.identity, url: normalized },
      };
      return isCompareRuntimeMessage(message) && post(message);
    },
    dispose: () => {
      if (disposed) return;
      for (const instanceId of [...instances.keys()]) unregisterInstance(instanceId);
      disposed = true;
      listeners.clear();
      if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
      const activePort = port;
      port = null;
      activePort?.disconnect();
    },
  };
}
