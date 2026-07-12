import type { DeviceOrientation } from './device';

export type IframeStatus = 'idle' | 'loading' | 'loaded' | 'error' | 'blocked';

export type CanvasTool = 'select' | 'pan';

export type SimulatorScale = number;

export type SimulatorScaleSetting = SimulatorScale | 'auto';

export type SimulatorSelection =
  { type: 'camera'; id: string } | { type: 'display-feature'; id: string } | null;

export interface IframeLoadState {
  status: IframeStatus;
  requestedUrl: string;
  loadedUrl?: string;
  message?: string;
}

export interface SimulatorNavigationEntry {
  url: string;
  visitedAt: number;
}

export interface SimulatorViewState {
  orientation: DeviceOrientation;
  scale: SimulatorScaleSetting;
  resolvedScale: number;
  showSafeArea: boolean;
  showRulers: boolean;
  showGrid: boolean;
  showShadow: boolean;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  selection: SimulatorSelection;
}
