import type {
  CompareBridgeIdentity,
  CompareRuntimeMessage,
  CompareScrollProgress,
  CompareSyncCapability,
} from '../types/compare-message';
import { calculateScrollOffset, type ScrollableSize } from './scroll-progress';
import { isValidSimulatorUrl } from './url';

export const COMPARE_IFRAME_NAME_PREFIX = 'device-simulator-compare-v1';

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;
const MAX_URL_LENGTH = 8192;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: UnknownRecord, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function isCompareRuntimeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value);
}

function isProgress(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isSafeRuntimeUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_URL_LENGTH &&
    /^https?:\/\//i.test(value) &&
    isValidSimulatorUrl(value)
  );
}

function isCapability(value: unknown): value is CompareSyncCapability {
  if (!isRecord(value) || !hasOnlyKeys(value, ['scroll', 'navigation', 'reason'])) return false;
  if (typeof value.scroll !== 'boolean' || typeof value.navigation !== 'boolean') return false;
  return (
    value.reason === undefined ||
    value.reason === 'bridge-ready' ||
    value.reason === 'bridge-disconnected' ||
    value.reason === 'bridge-timeout' ||
    value.reason === 'unsupported-url'
  );
}

function hasIdentity(value: UnknownRecord): value is UnknownRecord & CompareBridgeIdentity {
  return (
    isCompareRuntimeIdentifier(value.sessionId) &&
    isCompareRuntimeIdentifier(value.instanceId) &&
    isCompareRuntimeIdentifier(value.bridgeToken)
  );
}

export function isCompareBridgeIdentity(value: unknown): value is CompareBridgeIdentity {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['sessionId', 'instanceId', 'bridgeToken']) &&
    hasIdentity(value)
  );
}

export function createCompareIframeName(identity: CompareBridgeIdentity): string {
  if (!isCompareBridgeIdentity(identity)) {
    throw new TypeError('Compare iframe identity is invalid.');
  }
  return [
    COMPARE_IFRAME_NAME_PREFIX,
    identity.sessionId,
    identity.instanceId,
    identity.bridgeToken,
  ].join(':');
}

export function parseCompareIframeName(value: string): CompareBridgeIdentity | null {
  const [prefix, sessionId, instanceId, bridgeToken, extra] = value.split(':');
  if (
    prefix !== COMPARE_IFRAME_NAME_PREFIX ||
    sessionId === undefined ||
    instanceId === undefined ||
    bridgeToken === undefined ||
    extra !== undefined
  ) {
    return null;
  }
  const identity = { sessionId, instanceId, bridgeToken };
  return isCompareBridgeIdentity(identity) ? identity : null;
}

export function isControlledComparePageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isCompareRuntimeMessage(value: unknown): value is CompareRuntimeMessage {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['source', 'type', 'payload']) ||
    value.source !== 'device-simulator-compare' ||
    typeof value.type !== 'string' ||
    !isRecord(value.payload) ||
    !hasIdentity(value.payload)
  ) {
    return false;
  }

  const payload = value.payload;
  const identityKeys = ['sessionId', 'instanceId', 'bridgeToken'];
  switch (value.type) {
    case 'COMPARE_REGISTER_INSTANCE':
    case 'COMPARE_UNREGISTER_INSTANCE':
      return hasOnlyKeys(payload, identityKeys);
    case 'COMPARE_FRAME_READY':
      return (
        hasOnlyKeys(payload, [...identityKeys, 'url', 'capability']) &&
        isSafeRuntimeUrl(payload.url) &&
        isCapability(payload.capability)
      );
    case 'COMPARE_INSTANCE_CAPABILITY':
      return (
        hasOnlyKeys(payload, [...identityKeys, 'capability']) && isCapability(payload.capability)
      );
    case 'COMPARE_SCROLL_EVENT':
    case 'COMPARE_APPLY_SCROLL':
      return (
        hasOnlyKeys(payload, [
          ...identityKeys,
          'syncToken',
          'verticalProgress',
          'horizontalProgress',
        ]) &&
        isCompareRuntimeIdentifier(payload.syncToken) &&
        isProgress(payload.verticalProgress) &&
        isProgress(payload.horizontalProgress)
      );
    case 'COMPARE_NAVIGATION_EVENT':
    case 'COMPARE_APPLY_NAVIGATION':
      return hasOnlyKeys(payload, [...identityKeys, 'url']) && isSafeRuntimeUrl(payload.url);
    default:
      return false;
  }
}

export function calculateScrollPosition(
  progress: CompareScrollProgress,
  metrics: ScrollableSize,
): { top: number; left: number } {
  const offset = calculateScrollOffset(progress, metrics);
  return { top: offset.scrollTop, left: offset.scrollLeft };
}
