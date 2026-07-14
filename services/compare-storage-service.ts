import { COMPARE_STORAGE_VERSION, STORAGE_KEYS } from '../constants/storage-keys';
import {
  DEFAULT_COMPARE_DATA,
  MAX_COMPARE_CANVAS_SCALE,
  MAX_COMPARE_GRID_SIZE,
  MAX_COMPARE_INSTANCE_SCALE,
  MIN_COMPARE_CANVAS_SCALE,
  MIN_COMPARE_GRID_SIZE,
  MIN_COMPARE_INSTANCE_SCALE,
} from '../stores/compare-store';
import type {
  CanvasPosition,
  CompareDeviceInstance,
  CompareLayoutMode,
  PersistedCompareData,
  WorkspaceMode,
} from '../types/compare';
import { isCompareRuntimeIdentifier } from '../utils/compare-message';
import { normalizeCompareInstanceUrl } from '../utils/compare-url';
import { storageService } from './storage-service';

type UnknownRecord = Record<string, unknown>;

const MIN_SUPPORTED_COMPARE_STORAGE_VERSION = 1;
const MAX_COORDINATE_MAGNITUDE = 1_000_000;
const MAX_URL_LENGTH = 8_192;
const MAX_ID_LENGTH = 300;
const MAX_NAME_LENGTH = 200;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function sanitizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id.length > 0 && id.length <= MAX_ID_LENGTH ? id : null;
}

function sanitizeOptionalString(value: unknown, maximumLength: number): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().slice(0, maximumLength);
  return normalized || undefined;
}

function sanitizeInstanceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return null;
  return normalizeCompareInstanceUrl(value);
}

function sanitizePosition(value: unknown): CanvasPosition | null {
  if (!isRecord(value)) return null;
  const { x, y } = value;
  if (typeof x !== 'number' || !Number.isFinite(x)) return null;
  if (typeof y !== 'number' || !Number.isFinite(y)) return null;
  return {
    x: clamp(x, -MAX_COORDINATE_MAGNITUDE, MAX_COORDINATE_MAGNITUDE),
    y: clamp(y, -MAX_COORDINATE_MAGNITUDE, MAX_COORDINATE_MAGNITUDE),
  };
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function sanitizeInstance(value: unknown): CompareDeviceInstance | null {
  if (!isRecord(value)) return null;
  const id = isCompareRuntimeIdentifier(value.id) ? value.id : null;
  const deviceId = sanitizeId(value.deviceId);
  const url = sanitizeInstanceUrl(value.url);
  const position = sanitizePosition(value.position);
  const name = sanitizeOptionalString(value.name, MAX_NAME_LENGTH);
  const syncGroupId = sanitizeOptionalString(value.syncGroupId, MAX_ID_LENGTH);

  if (
    !id ||
    !deviceId ||
    url === null ||
    !position ||
    name === null ||
    syncGroupId === null ||
    (value.orientation !== 'portrait' && value.orientation !== 'landscape') ||
    typeof value.scale !== 'number' ||
    !Number.isFinite(value.scale) ||
    typeof value.safeAreaVisible !== 'boolean' ||
    typeof value.cameraVisible !== 'boolean' ||
    typeof value.displayFeaturesVisible !== 'boolean' ||
    typeof value.frameVisible !== 'boolean' ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }

  return {
    id,
    deviceId,
    ...(name ? { name } : {}),
    url,
    orientation: value.orientation,
    scale: clamp(value.scale, MIN_COMPARE_INSTANCE_SCALE, MAX_COMPARE_INSTANCE_SCALE),
    position,
    safeAreaVisible: value.safeAreaVisible,
    cameraVisible: value.cameraVisible,
    displayFeaturesVisible: value.displayFeaturesVisible,
    frameVisible: value.frameVisible,
    ...(syncGroupId ? { syncGroupId } : {}),
    createdAt: value.createdAt,
    updatedAt: Math.max(value.createdAt, value.updatedAt),
  };
}

function sanitizeWorkspaceMode(value: unknown): WorkspaceMode {
  return value === 'compare' ? 'compare' : 'single';
}

function sanitizeLayoutMode(value: unknown): CompareLayoutMode {
  return value === 'horizontal' || value === 'vertical' || value === 'grid' ? value : 'free';
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function finiteNumberOrDefault(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/**
 * Validates persisted compare data without consulting the device store. A
 * structurally valid instance with a missing profile remains recoverable in the UI.
 */
export function sanitizeCompareData(value: unknown): PersistedCompareData | null {
  if (!isRecord(value)) return null;

  const instances: CompareDeviceInstance[] = [];
  const seenInstanceIds = new Set<string>();
  if (Array.isArray(value.instances)) {
    for (const candidate of value.instances) {
      const instance = sanitizeInstance(candidate);
      if (!instance || seenInstanceIds.has(instance.id)) continue;
      seenInstanceIds.add(instance.id);
      instances.push(instance);
    }
  }

  const globalUrl = sanitizeInstanceUrl(value.globalUrl) ?? DEFAULT_COMPARE_DATA.globalUrl;
  const canvasOffset = sanitizePosition(value.canvasOffset) ?? {
    ...DEFAULT_COMPARE_DATA.canvasOffset,
  };
  const canvasScale = clamp(
    finiteNumberOrDefault(value.canvasScale, DEFAULT_COMPARE_DATA.canvasScale),
    MIN_COMPARE_CANVAS_SCALE,
    MAX_COMPARE_CANVAS_SCALE,
  );
  const gridSize = Math.round(
    clamp(
      finiteNumberOrDefault(value.gridSize, DEFAULT_COMPARE_DATA.gridSize),
      MIN_COMPARE_GRID_SIZE,
      MAX_COMPARE_GRID_SIZE,
    ),
  );

  return {
    workspaceMode: sanitizeWorkspaceMode(value.workspaceMode),
    instances,
    canvasOffset,
    canvasScale,
    globalUrl,
    syncScrollEnabled: booleanOrDefault(
      value.syncScrollEnabled,
      DEFAULT_COMPARE_DATA.syncScrollEnabled,
    ),
    syncNavigationEnabled: booleanOrDefault(
      value.syncNavigationEnabled,
      DEFAULT_COMPARE_DATA.syncNavigationEnabled,
    ),
    syncRefreshEnabled: booleanOrDefault(
      value.syncRefreshEnabled,
      DEFAULT_COMPARE_DATA.syncRefreshEnabled,
    ),
    syncOrientationEnabled: booleanOrDefault(
      value.syncOrientationEnabled,
      DEFAULT_COMPARE_DATA.syncOrientationEnabled,
    ),
    layoutMode: sanitizeLayoutMode(value.layoutMode),
    showGrid: booleanOrDefault(value.showGrid, DEFAULT_COMPARE_DATA.showGrid),
    snapToGrid: booleanOrDefault(value.snapToGrid, DEFAULT_COMPARE_DATA.snapToGrid),
    gridSize,
    leftPanelCollapsed: booleanOrDefault(
      value.leftPanelCollapsed,
      DEFAULT_COMPARE_DATA.leftPanelCollapsed,
    ),
    rightPanelCollapsed: booleanOrDefault(
      value.rightPanelCollapsed,
      DEFAULT_COMPARE_DATA.rightPanelCollapsed,
    ),
  };
}

function migrateVersion1ToVersion2(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return {
    ...value,
    workspaceMode: sanitizeWorkspaceMode(value.workspaceMode),
    leftPanelCollapsed: booleanOrDefault(value.leftPanelCollapsed, false),
    rightPanelCollapsed: booleanOrDefault(value.rightPanelCollapsed, false),
  };
}

/** Applies every schema step in order before validating the current shape. */
export function migrateCompareData(
  storedVersion: number,
  storedData: unknown,
): PersistedCompareData | null {
  if (
    !Number.isInteger(storedVersion) ||
    storedVersion < MIN_SUPPORTED_COMPARE_STORAGE_VERSION ||
    storedVersion > COMPARE_STORAGE_VERSION
  ) {
    return null;
  }

  let version = storedVersion;
  let data = storedData;
  while (version < COMPARE_STORAGE_VERSION) {
    switch (version) {
      case 1:
        data = migrateVersion1ToVersion2(data);
        version = 2;
        break;
      default:
        return null;
    }
  }
  return sanitizeCompareData(data);
}

export const compareStorageService = {
  async read(): Promise<PersistedCompareData | null> {
    for (
      let version = COMPARE_STORAGE_VERSION;
      version >= MIN_SUPPORTED_COMPARE_STORAGE_VERSION;
      version -= 1
    ) {
      const data = await storageService.read<unknown>(STORAGE_KEYS.compare, version);
      if (data === null) continue;
      const migrated = migrateCompareData(version, data);
      if (migrated && version !== COMPARE_STORAGE_VERSION) {
        try {
          await storageService.write(STORAGE_KEYS.compare, COMPARE_STORAGE_VERSION, migrated);
        } catch (error) {
          console.warn('[storage] Unable to write migrated compare state', error);
        }
      }
      return migrated;
    }
    return null;
  },

  async write(data: PersistedCompareData): Promise<void> {
    await storageService.write(STORAGE_KEYS.compare, COMPARE_STORAGE_VERSION, data);
  },
};
