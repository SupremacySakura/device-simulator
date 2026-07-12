import type { ExtensionMessage } from '../types/message';
import { validateDeviceProfile } from './validation';
import { isValidSimulatorUrl } from './url';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isSafeArea(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return ['top', 'right', 'bottom', 'left'].every((key) => {
    const inset = value[key];
    return typeof inset === 'number' && Number.isFinite(inset) && inset >= 0;
  });
}

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  if (!isRecord(value) || typeof value.type !== 'string') return false;
  switch (value.type) {
    case 'PING':
    case 'PONG':
      return true;
    case 'OPEN_SIMULATOR':
      return (
        isRecord(value.payload) &&
        isOptionalString(value.payload.url) &&
        (value.payload.url === undefined || isValidSimulatorUrl(value.payload.url)) &&
        isOptionalString(value.payload.deviceId)
      );
    case 'SET_SAFE_AREA':
      return isSafeArea(value.payload);
    case 'SET_DEVICE_CONTEXT':
      return (
        isRecord(value.payload) &&
        (value.payload.orientation === 'portrait' || value.payload.orientation === 'landscape') &&
        validateDeviceProfile(value.payload.device).success
      );
    default:
      return false;
  }
}
