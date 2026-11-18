import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  serializeSettingsStore,
  useSettingsStore,
  type DeviceSimulatorSettings,
} from '../stores/settings-store';
import {
  serializeDeviceStore,
  useDeviceStore,
  type PersistedDeviceData,
} from '../stores/device-store';
import {
  serializeSimulatorStore,
  useSimulatorStore,
  type PersistedSimulatorData,
} from '../stores/simulator-store';
import { STORAGE_KEYS, STORAGE_VERSION } from '../constants/storage-keys';
import { storageService } from '../services/storage-service';
import type { DeviceProfile } from '../types/device';

let initialization: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDeviceData(value: unknown): PersistedDeviceData | null {
  if (!isRecord(value)) return null;
  const customDevices = Array.isArray(value['customDevices'])
    ? (value['customDevices'] as unknown[]).filter(isStoredDevice)
    : [];
  return {
    customDevices,
    currentDeviceId: typeof value['currentDeviceId'] === 'string' ? value['currentDeviceId'] : '',
  };
}

function isStoredDevice(value: unknown): value is DeviceProfile {
  if (!isRecord(value)) return false;
  const portrait = value['portrait'];
  const landscape = value['landscape'];
  return (
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    isRecord(portrait) &&
    isRecord(landscape) &&
    typeof portrait['width'] === 'number' &&
    typeof portrait['height'] === 'number' &&
    isRecord(portrait['safeArea']) &&
    isRecord(landscape['safeArea'])
  );
}

function parseSettings(value: unknown): DeviceSimulatorSettings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  return {
    defaultScale:
      typeof value['defaultScale'] === 'number' && Number.isFinite(value['defaultScale'])
        ? value['defaultScale']
        : DEFAULT_SETTINGS.defaultScale,
    zoomMode: value['zoomMode'] === 'manual' ? 'manual' : 'auto',
    lastStandaloneUrl:
      typeof value['lastStandaloneUrl'] === 'string'
        ? value['lastStandaloneUrl']
        : DEFAULT_SETTINGS.lastStandaloneUrl,
  };
}

function parseSimulator(value: unknown): PersistedSimulatorData | null {
  if (!isRecord(value)) return null;
  const orientation = value['orientation'];
  const zoomMode = value['zoomMode'];
  const manualScale = value['manualScale'];
  if (orientation !== 'portrait' && orientation !== 'landscape') return null;
  if (zoomMode !== 'auto' && zoomMode !== 'manual') return null;
  if (typeof manualScale !== 'number' || !Number.isFinite(manualScale)) return null;
  return {
    url: typeof value['url'] === 'string' ? value['url'] : '',
    orientation,
    zoomMode,
    manualScale,
  };
}

function debounceWrite<T>(write: (data: T) => Promise<void>, delay = 180) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (data: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void write(data).catch((error: unknown) =>
        console.warn('[storage] deferred write failed', error),
      );
    }, delay);
  };
}

async function initialize(): Promise<void> {
  const [deviceData, settingsData, simulatorData] = await Promise.all([
    storageService.read<unknown>(STORAGE_KEYS.devices, STORAGE_VERSION),
    storageService.read<unknown>(STORAGE_KEYS.settings, STORAGE_VERSION),
    storageService.read<unknown>(STORAGE_KEYS.simulator, STORAGE_VERSION),
  ]);

  useDeviceStore.getState().hydrate(parseDeviceData(deviceData));
  useSettingsStore.getState().hydrate(parseSettings(settingsData));
  useSimulatorStore.getState().hydrate(parseSimulator(simulatorData));

  const persistDevices = debounceWrite((data: unknown) =>
    storageService.write(STORAGE_KEYS.devices, STORAGE_VERSION, data),
  );
  const persistSettings = debounceWrite((data: unknown) =>
    storageService.write(STORAGE_KEYS.settings, STORAGE_VERSION, data),
  );
  const persistSimulator = debounceWrite((data: unknown) =>
    storageService.write(STORAGE_KEYS.simulator, STORAGE_VERSION, data),
  );

  useDeviceStore.subscribe((state) => {
    if (state.hydrated) persistDevices(serializeDeviceStore(state));
  });
  useSettingsStore.subscribe((state) => {
    if (state.hydrated) persistSettings(serializeSettingsStore(state));
  });
  useSimulatorStore.subscribe((state) => {
    if (state.hydrated) persistSimulator(serializeSimulatorStore(state));
  });
}

export function useStorageReady(): { ready: boolean; error: string } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    initialization ??= initialize();
    void initialization
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
