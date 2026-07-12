import { create } from 'zustand';
import { DEFAULT_SETTINGS, type DeviceSimulatorSettings } from '../constants/default-settings';

interface SettingsStoreState extends DeviceSimulatorSettings {
  hydrated: boolean;
  hydrate: (settings: DeviceSimulatorSettings | null) => void;
  updateSettings: (settings: Partial<DeviceSimulatorSettings>) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,
  hydrate: (settings) => set({ ...(settings ?? DEFAULT_SETTINGS), hydrated: true }),
  updateSettings: (settings) => set(settings),
  resetSettings: () => set(DEFAULT_SETTINGS),
}));

export function serializeSettingsStore(state: SettingsStoreState): DeviceSimulatorSettings {
  return {
    defaultDeviceId: state.defaultDeviceId,
    defaultScale: state.defaultScale,
    showShadow: state.showShadow,
    showGrid: state.showGrid,
    autoOpenCurrentPage: state.autoOpenCurrentPage,
    layout: { ...state.layout },
  };
}
