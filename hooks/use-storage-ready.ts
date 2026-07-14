import { useEffect, useState } from 'react';
import { STORAGE_KEYS, STORAGE_VERSION } from '../constants/storage-keys';
import { compareStorageService } from '../services/compare-storage-service';
import { storageService } from '../services/storage-service';
import {
  serializeCompareStore,
  useCompareStore,
  type CompareStoreState,
} from '../stores/compare-store';
import {
  serializeDeviceStore,
  useDeviceStore,
  type PersistedDeviceData,
} from '../stores/device-store';
import {
  sanitizeHistoryData,
  serializeHistoryStore,
  useHistoryStore,
  type PersistedHistoryData,
} from '../stores/history-store';
import { serializeSettingsStore, useSettingsStore } from '../stores/settings-store';
import {
  serializeSimulatorStore,
  useSimulatorStore,
  type PersistedSimulatorData,
} from '../stores/simulator-store';
import { DEFAULT_SETTINGS, type DeviceSimulatorSettings } from '../constants/default-settings';
import type { SimulatorScaleSetting } from '../types/simulator';
import { isManualScale } from '../utils/device-scale';
import { tryNormalizeUrl } from '../utils/url';
import { validateDeviceProfile } from '../utils/validation';

let initialization: Promise<void> | null = null;
let subscriptionsReady = false;

function isDefaultScale(value: unknown): value is SimulatorScaleSetting {
  return (
    value === 'auto' ||
    value === 0.25 ||
    value === 0.5 ||
    value === 0.75 ||
    value === 1 ||
    value === 1.25 ||
    value === 1.5
  );
}

function isSimulatorScale(value: unknown): value is SimulatorScaleSetting {
  return value === 'auto' || isManualScale(value);
}

function debounceWrite<T>(write: (data: T) => Promise<void>, delay = 180) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (data: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void write(data).catch((error: unknown) =>
        console.warn('[storage] Deferred write failed', error),
      );
    }, delay);
  };
}

function parseDeviceData(value: unknown): PersistedDeviceData | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<PersistedDeviceData>;
  if (!Array.isArray(candidate.customDevices)) return null;
  const customDevices = candidate.customDevices.filter(
    (device) => validateDeviceProfile(device).valid,
  );
  const favoriteIds = Array.isArray(candidate.favoriteIds)
    ? candidate.favoriteIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    customDevices,
    favoriteIds,
    currentDeviceId: typeof candidate.currentDeviceId === 'string' ? candidate.currentDeviceId : '',
  };
}

function parseSettings(value: unknown): DeviceSimulatorSettings | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<DeviceSimulatorSettings>;
  const layout = candidate.layout;
  if (typeof candidate.defaultDeviceId !== 'string') return null;
  if (!isDefaultScale(candidate.defaultScale)) return null;
  if (
    typeof candidate.showShadow !== 'boolean' ||
    typeof candidate.showGrid !== 'boolean' ||
    typeof candidate.autoOpenCurrentPage !== 'boolean' ||
    typeof layout !== 'object' ||
    layout === null ||
    typeof layout.leftPanelCollapsed !== 'boolean' ||
    typeof layout.rightPanelCollapsed !== 'boolean'
  ) {
    return null;
  }
  return {
    defaultDeviceId: candidate.defaultDeviceId,
    defaultScale: candidate.defaultScale,
    showShadow: candidate.showShadow,
    showGrid: candidate.showGrid,
    autoOpenCurrentPage: candidate.autoOpenCurrentPage,
    layout: {
      leftPanelCollapsed: layout.leftPanelCollapsed,
      rightPanelCollapsed: layout.rightPanelCollapsed,
    },
  };
}

function parseHistory(value: unknown): PersistedHistoryData | null {
  return sanitizeHistoryData(value);
}

function parseSimulator(value: unknown): PersistedSimulatorData | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<PersistedSimulatorData>;
  if (candidate.orientation !== 'portrait' && candidate.orientation !== 'landscape') return null;
  if (!isSimulatorScale(candidate.scale)) return null;
  if (
    typeof candidate.showSafeArea !== 'boolean' ||
    typeof candidate.showRulers !== 'boolean' ||
    typeof candidate.showGrid !== 'boolean' ||
    typeof candidate.showShadow !== 'boolean' ||
    typeof candidate.leftPanelCollapsed !== 'boolean' ||
    typeof candidate.rightPanelCollapsed !== 'boolean' ||
    typeof candidate.canvasBackground !== 'string'
  ) {
    return null;
  }
  const normalizedUrl =
    typeof candidate.url === 'string' && candidate.url
      ? tryNormalizeUrl(candidate.url)
      : { success: true as const, url: '' };
  return {
    url: normalizedUrl.success ? normalizedUrl.url : '',
    orientation: candidate.orientation,
    scale: candidate.scale,
    showSafeArea: candidate.showSafeArea,
    showRulers: candidate.showRulers,
    showGrid: candidate.showGrid,
    showShadow: candidate.showShadow,
    leftPanelCollapsed: candidate.leftPanelCollapsed,
    rightPanelCollapsed: candidate.rightPanelCollapsed,
    canvasBackground: candidate.canvasBackground,
  };
}

function setupSubscriptions(): void {
  if (subscriptionsReady) return;
  subscriptionsReady = true;

  const persistDevices = debounceWrite((data: PersistedDeviceData) =>
    storageService.write(STORAGE_KEYS.devices, STORAGE_VERSION, data),
  );
  const persistSettings = debounceWrite((data: DeviceSimulatorSettings) =>
    storageService.write(STORAGE_KEYS.settings, STORAGE_VERSION, data),
  );
  const persistHistory = debounceWrite((data: PersistedHistoryData) =>
    storageService.write(STORAGE_KEYS.history, STORAGE_VERSION, data),
  );
  const persistSimulator = debounceWrite((data: PersistedSimulatorData) =>
    storageService.write(STORAGE_KEYS.simulator, STORAGE_VERSION, data),
  );
  const persistCompare = debounceWrite((data: CompareStoreState) =>
    compareStorageService.write(serializeCompareStore(data)),
  );

  useDeviceStore.subscribe((state, previous) => {
    if (state.hydrated && state !== previous) persistDevices(serializeDeviceStore(state));
  });
  useSettingsStore.subscribe((state, previous) => {
    if (state.hydrated && state !== previous) persistSettings(serializeSettingsStore(state));
  });
  useHistoryStore.subscribe((state, previous) => {
    if (state.hydrated && state !== previous) persistHistory(serializeHistoryStore(state));
  });
  useSimulatorStore.subscribe((state, previous) => {
    if (state.hydrated && state !== previous) persistSimulator(serializeSimulatorStore(state));
  });
  useCompareStore.subscribe((state, previous) => {
    if (state.hydrated && state.persistenceRevision !== previous.persistenceRevision) {
      persistCompare(state);
    }
  });
}

export function initializeStores(): Promise<void> {
  initialization ??= (async () => {
    const [deviceData, settings, history, simulator, compare] = await Promise.all([
      storageService.read<unknown>(STORAGE_KEYS.devices, STORAGE_VERSION),
      storageService.read<unknown>(STORAGE_KEYS.settings, STORAGE_VERSION),
      storageService.read<unknown>(STORAGE_KEYS.history, STORAGE_VERSION),
      storageService.read<unknown>(STORAGE_KEYS.simulator, STORAGE_VERSION),
      compareStorageService.read(),
    ]);

    const parsedDevices = parseDeviceData(deviceData);
    const parsedSettings = parseSettings(settings) ?? DEFAULT_SETTINGS;
    const parsedSimulator = parseSimulator(simulator);

    useDeviceStore.getState().hydrate(parsedDevices);
    useSettingsStore.getState().hydrate(parsedSettings);
    useHistoryStore.getState().hydrate(parseHistory(history));
    useSimulatorStore.getState().hydrate(parsedSimulator);
    useCompareStore.getState().hydrate(compare);

    if (parsedDevices === null) {
      useDeviceStore.getState().setCurrentDevice(parsedSettings.defaultDeviceId);
    }
    if (parsedSimulator === null) {
      const simulatorState = useSimulatorStore.getState();
      simulatorState.setScale(
        isDefaultScale(parsedSettings.defaultScale) ? parsedSettings.defaultScale : 'auto',
      );
      simulatorState.setShowShadow(parsedSettings.showShadow);
      simulatorState.setShowGrid(parsedSettings.showGrid);
      simulatorState.setLeftPanelCollapsed(parsedSettings.layout.leftPanelCollapsed);
      simulatorState.setRightPanelCollapsed(parsedSettings.layout.rightPanelCollapsed);
    }
    setupSubscriptions();
  })();
  return initialization;
}

export function useStorageReady(): { ready: boolean; error: string } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void initializeStores()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : '本地配置加载失败。');
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { ready, error };
}
