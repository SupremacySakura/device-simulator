import { create } from 'zustand';
import type { DeviceOrientation } from '../types/device';
import type { IframeStatus, SimulatorScaleSetting, SimulatorSelection } from '../types/simulator';
import { clampManualScale } from '../utils/device-scale';

export interface PersistedSimulatorData {
  url: string;
  orientation: DeviceOrientation;
  scale: SimulatorScaleSetting;
  showSafeArea: boolean;
  showRulers: boolean;
  showGrid: boolean;
  showShadow: boolean;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  canvasBackground: string;
}

interface SimulatorStoreState extends PersistedSimulatorData {
  urlInput: string;
  iframeStatus: IframeStatus;
  iframeMessage: string;
  resolvedScale: number;
  selection: SimulatorSelection;
  editMode: boolean;
  reloadKey: number;
  navigationStack: string[];
  navigationIndex: number;
  hydrated: boolean;
  hydrate: (data: PersistedSimulatorData | null) => void;
  setUrlInput: (value: string) => void;
  clearUrl: () => void;
  navigate: (url: string, replace?: boolean) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  setIframeState: (status: IframeStatus, message?: string) => void;
  setOrientation: (orientation: DeviceOrientation) => void;
  toggleOrientation: () => void;
  setScale: (scale: SimulatorScaleSetting) => void;
  setResolvedScale: (scale: number) => void;
  setShowSafeArea: (value: boolean) => void;
  setShowRulers: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  setShowShadow: (value: boolean) => void;
  setLeftPanelCollapsed: (value: boolean) => void;
  setRightPanelCollapsed: (value: boolean) => void;
  setCanvasBackground: (value: string) => void;
  setSelection: (selection: SimulatorSelection) => void;
  setEditMode: (value: boolean) => void;
}

const DEFAULT_SIMULATOR: PersistedSimulatorData = {
  url: '',
  orientation: 'portrait',
  scale: 'auto',
  showSafeArea: true,
  showRulers: true,
  showGrid: false,
  showShadow: true,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  canvasBackground: '#f9fafb',
};

export const useSimulatorStore = create<SimulatorStoreState>((set, get) => ({
  ...DEFAULT_SIMULATOR,
  urlInput: '',
  iframeStatus: 'idle',
  iframeMessage: '',
  resolvedScale: 0.75,
  selection: null,
  editMode: false,
  reloadKey: 0,
  navigationStack: [],
  navigationIndex: -1,
  hydrated: false,

  hydrate: (data) => {
    const restored = data ?? DEFAULT_SIMULATOR;
    set({
      ...restored,
      urlInput: restored.url,
      navigationStack: restored.url ? [restored.url] : [],
      navigationIndex: restored.url ? 0 : -1,
      hydrated: true,
    });
  },

  setUrlInput: (value) => set({ urlInput: value }),
  clearUrl: () =>
    set({
      url: '',
      urlInput: '',
      iframeStatus: 'idle',
      iframeMessage: '',
      navigationStack: [],
      navigationIndex: -1,
    }),

  navigate: (url, replace = false) => {
    const state = get();
    const base = state.navigationStack.slice(0, state.navigationIndex + 1);
    const stack = replace && base.length > 0 ? [...base.slice(0, -1), url] : [...base, url];
    set({
      url,
      urlInput: url,
      iframeStatus: 'loading',
      iframeMessage: '',
      navigationStack: stack,
      navigationIndex: stack.length - 1,
    });
  },

  goBack: () => {
    const { navigationIndex, navigationStack } = get();
    if (navigationIndex <= 0) return;
    const nextIndex = navigationIndex - 1;
    const url = navigationStack[nextIndex];
    if (!url) return;
    set({ url, urlInput: url, navigationIndex: nextIndex, iframeStatus: 'loading' });
  },

  goForward: () => {
    const { navigationIndex, navigationStack } = get();
    if (navigationIndex >= navigationStack.length - 1) return;
    const nextIndex = navigationIndex + 1;
    const url = navigationStack[nextIndex];
    if (!url) return;
    set({ url, urlInput: url, navigationIndex: nextIndex, iframeStatus: 'loading' });
  },

  reload: () => set((state) => ({ reloadKey: state.reloadKey + 1, iframeStatus: 'loading' })),
  setIframeState: (status, message = '') => set({ iframeStatus: status, iframeMessage: message }),
  setOrientation: (orientation) => set({ orientation, selection: null }),
  toggleOrientation: () =>
    set((state) => ({
      orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
      selection: null,
    })),
  setScale: (scale) => set({ scale: scale === 'auto' ? scale : clampManualScale(scale) }),
  setResolvedScale: (resolvedScale) => set({ resolvedScale }),
  setShowSafeArea: (showSafeArea) => set({ showSafeArea }),
  setShowRulers: (showRulers) => set({ showRulers }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowShadow: (showShadow) => set({ showShadow }),
  setLeftPanelCollapsed: (leftPanelCollapsed) => set({ leftPanelCollapsed }),
  setRightPanelCollapsed: (rightPanelCollapsed) => set({ rightPanelCollapsed }),
  setCanvasBackground: (canvasBackground) => set({ canvasBackground }),
  setSelection: (selection) => set({ selection }),
  setEditMode: (editMode) => set({ editMode }),
}));

export function serializeSimulatorStore(state: SimulatorStoreState): PersistedSimulatorData {
  return {
    url: state.url,
    orientation: state.orientation,
    scale: state.scale,
    showSafeArea: state.showSafeArea,
    showRulers: state.showRulers,
    showGrid: state.showGrid,
    showShadow: state.showShadow,
    leftPanelCollapsed: state.leftPanelCollapsed,
    rightPanelCollapsed: state.rightPanelCollapsed,
    canvasBackground: state.canvasBackground,
  };
}
