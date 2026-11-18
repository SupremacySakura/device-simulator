import { create } from 'zustand';
import type { ZoomMode } from '../types/simulator';

export interface DeviceSimulatorSettings {
  defaultScale: number;
  zoomMode: ZoomMode;
  lastStandaloneUrl: string;
}

export const DEFAULT_SETTINGS: DeviceSimulatorSettings = {
  defaultScale: 0.6,
  zoomMode: 'auto',
  lastStandaloneUrl: '',
};

interface SettingsStoreState extends DeviceSimulatorSettings {
  hydrated: boolean;
  hydrate: (settings: DeviceSimulatorSettings | null) => void;
  updateSettings: (settings: Partial<DeviceSimulatorSettings>) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: (settings) => set({ ...(settings ?? DEFAULT_SETTINGS), hydrated: true }),
  updateSettings: (settings) => set(settings),
}));

export function serializeSettingsStore(state: SettingsStoreState): DeviceSimulatorSettings {
  return {
    defaultScale: state.defaultScale,
    zoomMode: state.zoomMode,
    lastStandaloneUrl: state.lastStandaloneUrl,
  };
}
