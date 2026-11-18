import { useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  serializeSettingsStore,
  useSettingsStore,
  type DeviceSimulatorSettings,
} from '../stores/settings-store';
import { serializeDeviceStore, useDeviceStore } from '../stores/device-store';
import { serializeSimulatorStore, useSimulatorStore } from '../stores/simulator-store';
import { STORAGE_KEYS, STORAGE_VERSION } from '../constants/storage-keys';
import { storageService } from '../services/storage-service';

let initialization: Promise<void> | null = null;

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

  useDeviceStore.getState().hydrate((deviceData ?? null) as never);
  useSettingsStore
    .getState()
    .hydrate((settingsData as DeviceSimulatorSettings | null) ?? DEFAULT_SETTINGS);
  useSimulatorStore.getState().hydrate((simulatorData ?? null) as never);

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
