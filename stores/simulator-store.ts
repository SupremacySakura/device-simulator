import { create } from 'zustand';
import type { DeviceOrientation } from '../types/device';
import type { ZoomMode } from '../types/simulator';
import { clampManualScale } from '../utils/device-scale';

export interface PersistedSimulatorData {
  url: string;
  orientation: DeviceOrientation;
  zoomMode: ZoomMode;
  manualScale: number;
}

interface SimulatorStoreState extends PersistedSimulatorData {
  hydrated: boolean;
  hydrate: (data: PersistedSimulatorData | null) => void;
  setUrl: (url: string) => void;
  clearUrl: () => void;
  setOrientation: (orientation: DeviceOrientation) => void;
  toggleOrientation: () => void;
  setZoomMode: (mode: ZoomMode) => void;
  setManualScale: (scale: number) => void;
  stepScale: (direction: -1 | 1) => void;
}

const DEFAULT_SIMULATOR: PersistedSimulatorData = {
  url: '',
  orientation: 'portrait',
  zoomMode: 'auto',
  manualScale: 0.6,
};

export const useSimulatorStore = create<SimulatorStoreState>((set) => ({
  ...DEFAULT_SIMULATOR,
  hydrated: false,

  hydrate: (data) => set({ ...(data ?? DEFAULT_SIMULATOR), hydrated: true }),
  setUrl: (url) => set({ url }),
  clearUrl: () => set({ url: '' }),
  setOrientation: (orientation) => set({ orientation }),
  toggleOrientation: () =>
    set((state) => ({
      orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
    })),
  setZoomMode: (zoomMode) => set({ zoomMode }),
  setManualScale: (manualScale) => set({ manualScale: clampManualScale(manualScale) }),
  stepScale: (direction) =>
    set((state) => ({
      manualScale: Math.round(clampManualScale(state.manualScale + direction * 0.1) * 100) / 100,
      zoomMode: 'manual',
    })),
}));

export function serializeSimulatorStore(state: SimulatorStoreState): PersistedSimulatorData {
  return {
    url: state.url,
    orientation: state.orientation,
    zoomMode: state.zoomMode,
    manualScale: state.manualScale,
  };
}
