import type { DeviceOrientation } from './device';
import type { IframeStatus } from './simulator';

export type WorkspaceMode = 'single' | 'compare';

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export type CompareLayoutMode = 'free' | 'horizontal' | 'vertical' | 'grid';

export type CompareAutoLayoutMode = Exclude<CompareLayoutMode, 'free'>;

export type AlignmentAction =
  | 'align-left'
  | 'align-right'
  | 'align-top'
  | 'align-bottom'
  | 'align-horizontal-center'
  | 'align-vertical-center'
  | 'distribute-horizontal'
  | 'distribute-vertical';

export type CompareSyncSetting =
  'syncScrollEnabled' | 'syncNavigationEnabled' | 'syncRefreshEnabled' | 'syncOrientationEnabled';

/** A persistent canvas instance that references, but never copies, a device profile. */
export interface CompareDeviceInstance {
  id: string;
  deviceId: string;
  name?: string;
  url: string;
  orientation: DeviceOrientation;
  scale: number;
  position: CanvasPosition;
  safeAreaVisible: boolean;
  cameraVisible: boolean;
  displayFeaturesVisible: boolean;
  frameVisible: boolean;
  syncGroupId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PersistedCompareData {
  workspaceMode: WorkspaceMode;
  instances: CompareDeviceInstance[];
  canvasOffset: CanvasPosition;
  canvasScale: number;
  globalUrl: string;
  syncScrollEnabled: boolean;
  syncNavigationEnabled: boolean;
  syncRefreshEnabled: boolean;
  syncOrientationEnabled: boolean;
  layoutMode: CompareLayoutMode;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

export interface CompareInstanceRuntime {
  iframeStatus: IframeStatus;
  iframeMessage: string;
  reloadKey: number;
  observedUrl: string | null;
  scrollSyncSupported: boolean | null;
  navigationSyncSupported: boolean | null;
}

export type CompareRuntimeByInstanceId = Record<string, CompareInstanceRuntime>;

type CompareMutableInstanceFields = Omit<
  CompareDeviceInstance,
  'id' | 'createdAt' | 'updatedAt' | 'name' | 'syncGroupId'
>;

export type CompareInstanceCreateOptions = Partial<
  Omit<CompareMutableInstanceFields, 'deviceId'>
> & {
  name?: string | undefined;
  syncGroupId?: string | undefined;
};

export type CompareInstancePatch = Partial<CompareMutableInstanceFields> & {
  name?: string | undefined;
  syncGroupId?: string | undefined;
};

export type CompareSelectionMode = 'replace' | 'add' | 'toggle';

export type CompareInstancePositions = Readonly<Record<string, CanvasPosition>>;
