import type { DeviceOrientation } from './device';

export type ZoomMode = 'auto' | 'manual';

export interface SimulatorViewState {
  url: string;
  orientation: DeviceOrientation;
  zoomMode: ZoomMode;
  manualScale: number;
}
