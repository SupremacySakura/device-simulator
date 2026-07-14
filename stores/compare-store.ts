import { create } from 'zustand';
import type {
  CanvasPosition,
  CanvasTransform,
  CompareAutoLayoutMode,
  CompareDeviceInstance,
  CompareInstanceCreateOptions,
  CompareInstancePatch,
  CompareInstancePositions,
  CompareInstanceRuntime,
  CompareLayoutMode,
  CompareRuntimeByInstanceId,
  CompareSelectionMode,
  CompareSyncSetting,
  PersistedCompareData,
  WorkspaceMode,
} from '../types/compare';
import type { DeviceOrientation } from '../types/device';
import type { IframeStatus } from '../types/simulator';
import { normalizeCompareInstanceUrl } from '../utils/compare-url';
import { createId } from '../utils/id';

export const MIN_COMPARE_CANVAS_SCALE = 0.2;
export const MAX_COMPARE_CANVAS_SCALE = 2;
export const MIN_COMPARE_INSTANCE_SCALE = 0.25;
export const MAX_COMPARE_INSTANCE_SCALE = 2;
export const MIN_COMPARE_GRID_SIZE = 4;
export const MAX_COMPARE_GRID_SIZE = 200;

export const DEFAULT_COMPARE_DATA: PersistedCompareData = {
  workspaceMode: 'single',
  instances: [],
  canvasOffset: { x: 0, y: 0 },
  canvasScale: 1,
  globalUrl: '',
  syncScrollEnabled: false,
  syncNavigationEnabled: false,
  syncRefreshEnabled: false,
  syncOrientationEnabled: false,
  layoutMode: 'free',
  showGrid: true,
  snapToGrid: false,
  gridSize: 20,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
};

export interface CompareStoreState extends PersistedCompareData {
  selectedInstanceIds: string[];
  runtimeByInstanceId: CompareRuntimeByInstanceId;
  hydrated: boolean;
  persistenceRevision: number;
  hydrate: (data: PersistedCompareData | null) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  addInstance: (deviceId: string, options?: CompareInstanceCreateOptions) => string;
  duplicateInstance: (instanceId: string) => string | null;
  duplicateSelectedInstances: () => string[];
  removeInstance: (instanceId: string) => void;
  removeSelectedInstances: () => void;
  clearInstances: () => void;
  updateInstance: (instanceId: string, patch: CompareInstancePatch) => void;
  updateInstances: (instanceIds: readonly string[], patch: CompareInstancePatch) => void;
  recordInstanceNavigation: (instanceId: string, url: string) => void;
  replaceInstanceDevice: (instanceId: string, deviceId: string) => void;
  moveInstance: (instanceId: string, position: CanvasPosition) => void;
  commitInstancePositions: (positions: CompareInstancePositions) => void;
  translateSelected: (delta: CanvasPosition) => void;
  selectInstance: (instanceId: string, mode?: CompareSelectionMode) => void;
  selectInstances: (instanceIds: readonly string[], additive?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;
  bringToFront: (instanceId: string) => void;
  setGlobalUrl: (url: string) => void;
  loadGlobalUrl: () => void;
  setCanvasScale: (scale: number) => void;
  setCanvasOffset: (offset: CanvasPosition) => void;
  setCanvasTransform: (transform: CanvasTransform) => void;
  setLayoutMode: (mode: CompareLayoutMode) => void;
  applyLayout: (mode: CompareAutoLayoutMode, positions: CompareInstancePositions) => void;
  applyAlignment: (positions: CompareInstancePositions) => void;
  resetCanvasView: () => void;
  setSyncSetting: (setting: CompareSyncSetting, enabled: boolean) => void;
  setSyncScrollEnabled: (enabled: boolean) => void;
  setSyncNavigationEnabled: (enabled: boolean) => void;
  setSyncRefreshEnabled: (enabled: boolean) => void;
  setSyncOrientationEnabled: (enabled: boolean) => void;
  setShowGrid: (showGrid: boolean) => void;
  setSnapToGrid: (snapToGrid: boolean) => void;
  setGridSize: (gridSize: number) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  rotateInstance: (instanceId: string) => void;
  rotateSelected: () => void;
  rotateAll: (mode?: 'toggle' | DeviceOrientation) => void;
  refreshInstance: (instanceId: string) => void;
  refreshAll: () => void;
  setIframeState: (instanceId: string, status: IframeStatus, message?: string) => void;
  setSyncCapabilities: (
    instanceId: string,
    capabilities: Partial<
      Pick<CompareInstanceRuntime, 'scrollSyncSupported' | 'navigationSyncSupported'>
    >,
  ) => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampCanvasScale(scale: number): number {
  return clamp(scale, MIN_COMPARE_CANVAS_SCALE, MAX_COMPARE_CANVAS_SCALE);
}

function clampInstanceScale(scale: number): number {
  return clamp(scale, MIN_COMPARE_INSTANCE_SCALE, MAX_COMPARE_INSTANCE_SCALE);
}

function normalizeGlobalUrl(value: string): string | null {
  return normalizeCompareInstanceUrl(value);
}

function isFinitePosition(position: CanvasPosition): boolean {
  return Number.isFinite(position.x) && Number.isFinite(position.y);
}

function createRuntime(): CompareInstanceRuntime {
  return {
    iframeStatus: 'idle',
    iframeMessage: '',
    reloadKey: 0,
    observedUrl: null,
    scrollSyncSupported: null,
    navigationSyncSupported: null,
  };
}

function createRuntimeMap(instances: readonly CompareDeviceInstance[]): CompareRuntimeByInstanceId {
  return Object.fromEntries(instances.map((instance) => [instance.id, createRuntime()]));
}

function cloneInstance(instance: CompareDeviceInstance): CompareDeviceInstance {
  return { ...instance, position: { ...instance.position } };
}

function clonePersistedData(data: PersistedCompareData): PersistedCompareData {
  return {
    ...data,
    instances: data.instances.map(cloneInstance),
    canvasOffset: { ...data.canvasOffset },
  };
}

function patchInstance(
  instance: CompareDeviceInstance,
  patch: CompareInstancePatch,
  updatedAt: number,
): CompareDeviceInstance | null {
  if (patch.deviceId !== undefined && patch.deviceId.trim().length === 0) return null;
  if (patch.scale !== undefined && !Number.isFinite(patch.scale)) return null;
  if (patch.position !== undefined && !isFinitePosition(patch.position)) return null;
  if (
    patch.orientation !== undefined &&
    patch.orientation !== 'portrait' &&
    patch.orientation !== 'landscape'
  ) {
    return null;
  }

  const url = patch.url === undefined ? instance.url : normalizeCompareInstanceUrl(patch.url);
  if (url === null) return null;

  const next: CompareDeviceInstance = {
    ...instance,
    deviceId: patch.deviceId?.trim() ?? instance.deviceId,
    url,
    orientation: patch.orientation ?? instance.orientation,
    scale: patch.scale === undefined ? instance.scale : clampInstanceScale(patch.scale),
    position: patch.position === undefined ? instance.position : { ...patch.position },
    safeAreaVisible: patch.safeAreaVisible ?? instance.safeAreaVisible,
    cameraVisible: patch.cameraVisible ?? instance.cameraVisible,
    displayFeaturesVisible: patch.displayFeaturesVisible ?? instance.displayFeaturesVisible,
    frameVisible: patch.frameVisible ?? instance.frameVisible,
    updatedAt: instance.updatedAt,
  };

  if (Object.hasOwn(patch, 'name')) {
    const name = patch.name?.trim().slice(0, 200);
    if (name) next.name = name;
    else delete next.name;
  }
  if (Object.hasOwn(patch, 'syncGroupId')) {
    const syncGroupId = patch.syncGroupId?.trim().slice(0, 300);
    if (syncGroupId) next.syncGroupId = syncGroupId;
    else delete next.syncGroupId;
  }

  const changed =
    next.deviceId !== instance.deviceId ||
    next.name !== instance.name ||
    next.url !== instance.url ||
    next.orientation !== instance.orientation ||
    next.scale !== instance.scale ||
    next.position.x !== instance.position.x ||
    next.position.y !== instance.position.y ||
    next.safeAreaVisible !== instance.safeAreaVisible ||
    next.cameraVisible !== instance.cameraVisible ||
    next.displayFeaturesVisible !== instance.displayFeaturesVisible ||
    next.frameVisible !== instance.frameVisible ||
    next.syncGroupId !== instance.syncGroupId;
  return changed ? { ...next, updatedAt } : instance;
}

function duplicateInstance(
  source: CompareDeviceInstance,
  id: string,
  now: number,
  offsetIndex = 1,
): CompareDeviceInstance {
  return {
    ...cloneInstance(source),
    id,
    ...(source.name ? { name: `${source.name} 副本` } : {}),
    position: {
      x: source.position.x + 40 * offsetIndex,
      y: source.position.y + 40 * offsetIndex,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function updatePositions(
  instances: readonly CompareDeviceInstance[],
  positions: CompareInstancePositions,
  now: number,
): { instances: CompareDeviceInstance[]; changed: boolean } {
  let changed = false;
  const nextInstances = instances.map((instance) => {
    const position = positions[instance.id];
    if (
      position === undefined ||
      !isFinitePosition(position) ||
      (position.x === instance.position.x && position.y === instance.position.y)
    ) {
      return instance;
    }
    changed = true;
    return { ...instance, position: { ...position }, updatedAt: now };
  });
  return { instances: nextInstances, changed };
}

function updateRuntimeReload(
  runtimeByInstanceId: CompareRuntimeByInstanceId,
  instanceIds: readonly string[],
): CompareRuntimeByInstanceId {
  const next = { ...runtimeByInstanceId };
  for (const instanceId of instanceIds) {
    const runtime = next[instanceId] ?? createRuntime();
    next[instanceId] = {
      ...runtime,
      iframeStatus: 'loading',
      iframeMessage: '',
      reloadKey: runtime.reloadKey + 1,
      observedUrl: null,
    };
  }
  return next;
}

const initialData = clonePersistedData(DEFAULT_COMPARE_DATA);

export const useCompareStore = create<CompareStoreState>((set, get) => ({
  ...initialData,
  selectedInstanceIds: [],
  runtimeByInstanceId: {},
  hydrated: false,
  persistenceRevision: 0,

  hydrate: (data) => {
    const restored = clonePersistedData(data ?? DEFAULT_COMPARE_DATA);
    set({
      ...restored,
      selectedInstanceIds: [],
      runtimeByInstanceId: createRuntimeMap(restored.instances),
      hydrated: true,
      persistenceRevision: 0,
    });
  },

  setWorkspaceMode: (workspaceMode) =>
    set((state) =>
      state.workspaceMode === workspaceMode
        ? state
        : { workspaceMode, persistenceRevision: state.persistenceRevision + 1 },
    ),

  addInstance: (deviceId, options = {}) => {
    const normalizedDeviceId = deviceId.trim();
    if (!normalizedDeviceId) throw new Error('A compare instance requires a device ID.');
    const id = createId();
    const now = Date.now();

    set((state) => {
      const requestedUrl = options.url ?? state.globalUrl;
      const url = normalizeCompareInstanceUrl(requestedUrl) ?? '';
      const position = options.position ?? { x: 0, y: 0 };
      const instance: CompareDeviceInstance = {
        id,
        deviceId: normalizedDeviceId,
        url,
        orientation: options.orientation ?? 'portrait',
        scale: clampInstanceScale(options.scale ?? 1),
        position: isFinitePosition(position) ? { ...position } : { x: 0, y: 0 },
        safeAreaVisible: options.safeAreaVisible ?? true,
        cameraVisible: options.cameraVisible ?? true,
        displayFeaturesVisible: options.displayFeaturesVisible ?? true,
        frameVisible: options.frameVisible ?? true,
        ...(options.name?.trim() ? { name: options.name.trim().slice(0, 200) } : {}),
        ...(options.syncGroupId?.trim()
          ? { syncGroupId: options.syncGroupId.trim().slice(0, 300) }
          : {}),
        createdAt: now,
        updatedAt: now,
      };
      return {
        instances: [...state.instances, instance],
        selectedInstanceIds: [id],
        runtimeByInstanceId: { ...state.runtimeByInstanceId, [id]: createRuntime() },
        persistenceRevision: state.persistenceRevision + 1,
      };
    });
    return id;
  },

  duplicateInstance: (instanceId) => {
    const source = get().instances.find((instance) => instance.id === instanceId);
    if (!source) return null;
    const id = createId();
    const copy = duplicateInstance(source, id, Date.now());
    set((state) => ({
      instances: [...state.instances, copy],
      selectedInstanceIds: [id],
      runtimeByInstanceId: { ...state.runtimeByInstanceId, [id]: createRuntime() },
      persistenceRevision: state.persistenceRevision + 1,
    }));
    return id;
  },

  duplicateSelectedInstances: () => {
    const state = get();
    const selected = new Set(state.selectedInstanceIds);
    const sources = state.instances.filter((instance) => selected.has(instance.id));
    if (sources.length === 0) return [];
    const now = Date.now();
    const copies = sources.map((source) => duplicateInstance(source, createId(), now));
    const copyIds = copies.map((instance) => instance.id);
    set((current) => ({
      instances: [...current.instances, ...copies],
      selectedInstanceIds: copyIds,
      runtimeByInstanceId: {
        ...current.runtimeByInstanceId,
        ...createRuntimeMap(copies),
      },
      persistenceRevision: current.persistenceRevision + 1,
    }));
    return copyIds;
  },

  removeInstance: (instanceId) =>
    set((state) => {
      if (!state.instances.some((instance) => instance.id === instanceId)) return state;
      const runtimeByInstanceId = { ...state.runtimeByInstanceId };
      delete runtimeByInstanceId[instanceId];
      return {
        instances: state.instances.filter((instance) => instance.id !== instanceId),
        selectedInstanceIds: state.selectedInstanceIds.filter((id) => id !== instanceId),
        runtimeByInstanceId,
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  removeSelectedInstances: () =>
    set((state) => {
      if (state.selectedInstanceIds.length === 0) return state;
      const selected = new Set(state.selectedInstanceIds);
      const instances = state.instances.filter((instance) => !selected.has(instance.id));
      if (instances.length === state.instances.length) return { selectedInstanceIds: [] };
      const runtimeByInstanceId = { ...state.runtimeByInstanceId };
      for (const instanceId of selected) delete runtimeByInstanceId[instanceId];
      return {
        instances,
        selectedInstanceIds: [],
        runtimeByInstanceId,
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  clearInstances: () =>
    set((state) =>
      state.instances.length === 0
        ? { selectedInstanceIds: [], runtimeByInstanceId: {} }
        : {
            instances: [],
            selectedInstanceIds: [],
            runtimeByInstanceId: {},
            persistenceRevision: state.persistenceRevision + 1,
          },
    ),

  updateInstance: (instanceId, patch) =>
    set((state) => {
      const index = state.instances.findIndex((instance) => instance.id === instanceId);
      const current = state.instances[index];
      if (index < 0 || current === undefined) return state;
      const updated = patchInstance(current, patch, Date.now());
      if (!updated || updated === current) return state;
      const instances = [...state.instances];
      instances[index] = updated;
      const runtimeByInstanceId =
        patch.url === undefined
          ? state.runtimeByInstanceId
          : {
              ...state.runtimeByInstanceId,
              [instanceId]: {
                ...(state.runtimeByInstanceId[instanceId] ?? createRuntime()),
                observedUrl: null,
              },
            };
      return { instances, runtimeByInstanceId, persistenceRevision: state.persistenceRevision + 1 };
    }),

  updateInstances: (instanceIds, patch) =>
    set((state) => {
      const ids = new Set(instanceIds);
      if (ids.size === 0) return state;
      const now = Date.now();
      let changed = false;
      const instances = state.instances.map((instance) => {
        if (!ids.has(instance.id)) return instance;
        const updated = patchInstance(instance, patch, now);
        if (!updated || updated === instance) return instance;
        changed = true;
        return updated;
      });
      if (!changed) return state;
      const runtimeByInstanceId = { ...state.runtimeByInstanceId };
      if (patch.url !== undefined) {
        for (const instanceId of ids) {
          if (!state.instances.some((instance) => instance.id === instanceId)) continue;
          runtimeByInstanceId[instanceId] = {
            ...(runtimeByInstanceId[instanceId] ?? createRuntime()),
            observedUrl: null,
          };
        }
      }
      return { instances, runtimeByInstanceId, persistenceRevision: state.persistenceRevision + 1 };
    }),

  recordInstanceNavigation: (instanceId, url) =>
    set((state) => {
      const index = state.instances.findIndex((instance) => instance.id === instanceId);
      const current = state.instances[index];
      if (index < 0 || current === undefined) return state;
      const normalized = normalizeCompareInstanceUrl(url);
      if (!normalized) return state;
      const updated = patchInstance(current, { url: normalized }, Date.now());
      if (!updated) return state;
      const runtime = state.runtimeByInstanceId[instanceId] ?? createRuntime();
      const runtimeByInstanceId = {
        ...state.runtimeByInstanceId,
        [instanceId]: { ...runtime, observedUrl: normalized },
      };
      if (updated === current) return { runtimeByInstanceId };
      const instances = [...state.instances];
      instances[index] = updated;
      return {
        instances,
        runtimeByInstanceId,
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  replaceInstanceDevice: (instanceId, deviceId) => {
    get().updateInstance(instanceId, { deviceId });
  },

  moveInstance: (instanceId, position) => {
    get().commitInstancePositions({ [instanceId]: position });
  },

  commitInstancePositions: (positions) =>
    set((state) => {
      const result = updatePositions(state.instances, positions, Date.now());
      return result.changed
        ? {
            instances: result.instances,
            layoutMode: 'free',
            persistenceRevision: state.persistenceRevision + 1,
          }
        : state;
    }),

  translateSelected: (delta) => {
    if (!isFinitePosition(delta)) return;
    const state = get();
    const selected = new Set(state.selectedInstanceIds);
    const positions: Record<string, CanvasPosition> = {};
    for (const instance of state.instances) {
      if (!selected.has(instance.id)) continue;
      positions[instance.id] = {
        x: instance.position.x + delta.x,
        y: instance.position.y + delta.y,
      };
    }
    state.commitInstancePositions(positions);
  },

  selectInstance: (instanceId, mode = 'replace') =>
    set((state) => {
      if (!state.instances.some((instance) => instance.id === instanceId)) return state;
      if (mode === 'replace') return { selectedInstanceIds: [instanceId] };
      const selected = new Set(state.selectedInstanceIds);
      if (mode === 'toggle' && selected.has(instanceId)) selected.delete(instanceId);
      else selected.add(instanceId);
      return { selectedInstanceIds: [...selected] };
    }),

  selectInstances: (instanceIds, additive = false) =>
    set((state) => {
      const existing = new Set(state.instances.map((instance) => instance.id));
      const requested = instanceIds.filter(
        (id, index) => existing.has(id) && index === instanceIds.indexOf(id),
      );
      return {
        selectedInstanceIds: additive
          ? [...new Set([...state.selectedInstanceIds, ...requested])]
          : requested,
      };
    }),

  selectAll: () => set((state) => ({ selectedInstanceIds: state.instances.map(({ id }) => id) })),
  clearSelection: () => set({ selectedInstanceIds: [] }),

  bringToFront: (instanceId) =>
    set((state) => {
      if (!state.selectedInstanceIds.includes(instanceId)) return state;
      if (state.selectedInstanceIds.at(-1) === instanceId) return state;
      return {
        selectedInstanceIds: [
          ...state.selectedInstanceIds.filter((id) => id !== instanceId),
          instanceId,
        ],
      };
    }),

  setGlobalUrl: (globalUrl) => {
    const normalized = normalizeGlobalUrl(globalUrl);
    if (normalized === null) return;
    set((state) =>
      state.globalUrl === normalized
        ? state
        : { globalUrl: normalized, persistenceRevision: state.persistenceRevision + 1 },
    );
  },

  loadGlobalUrl: () =>
    set((state) => {
      if (state.instances.length === 0) return state;
      const changed = state.instances.some((instance) => instance.url !== state.globalUrl);
      const now = Date.now();
      return {
        instances: changed
          ? state.instances.map((instance) => ({
              ...instance,
              url: state.globalUrl,
              updatedAt: now,
            }))
          : state.instances,
        runtimeByInstanceId: updateRuntimeReload(
          state.runtimeByInstanceId,
          state.instances.map((instance) => instance.id),
        ),
        ...(changed ? { persistenceRevision: state.persistenceRevision + 1 } : {}),
      };
    }),

  setCanvasScale: (canvasScale) => {
    if (!Number.isFinite(canvasScale)) return;
    const normalized = clampCanvasScale(canvasScale);
    set((state) =>
      state.canvasScale === normalized
        ? state
        : { canvasScale: normalized, persistenceRevision: state.persistenceRevision + 1 },
    );
  },

  setCanvasOffset: (canvasOffset) => {
    if (!isFinitePosition(canvasOffset)) return;
    set((state) =>
      state.canvasOffset.x === canvasOffset.x && state.canvasOffset.y === canvasOffset.y
        ? state
        : {
            canvasOffset: { ...canvasOffset },
            persistenceRevision: state.persistenceRevision + 1,
          },
    );
  },

  setCanvasTransform: (transform) => {
    if (
      !Number.isFinite(transform.offsetX) ||
      !Number.isFinite(transform.offsetY) ||
      !Number.isFinite(transform.scale)
    ) {
      return;
    }
    const canvasScale = clampCanvasScale(transform.scale);
    set((state) =>
      state.canvasOffset.x === transform.offsetX &&
      state.canvasOffset.y === transform.offsetY &&
      state.canvasScale === canvasScale
        ? state
        : {
            canvasOffset: { x: transform.offsetX, y: transform.offsetY },
            canvasScale,
            persistenceRevision: state.persistenceRevision + 1,
          },
    );
  },

  setLayoutMode: (layoutMode) =>
    set((state) =>
      state.layoutMode === layoutMode
        ? state
        : { layoutMode, persistenceRevision: state.persistenceRevision + 1 },
    ),

  applyLayout: (layoutMode, positions) =>
    set((state) => {
      const result = updatePositions(state.instances, positions, Date.now());
      if (!result.changed && state.layoutMode === layoutMode) return state;
      return {
        instances: result.instances,
        layoutMode,
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  applyAlignment: (positions) =>
    set((state) => {
      const result = updatePositions(state.instances, positions, Date.now());
      return result.changed
        ? {
            instances: result.instances,
            layoutMode: 'free',
            persistenceRevision: state.persistenceRevision + 1,
          }
        : state;
    }),

  resetCanvasView: () =>
    set((state) =>
      state.canvasOffset.x === 0 && state.canvasOffset.y === 0 && state.canvasScale === 1
        ? state
        : {
            canvasOffset: { x: 0, y: 0 },
            canvasScale: 1,
            persistenceRevision: state.persistenceRevision + 1,
          },
    ),

  setSyncSetting: (setting, enabled) => {
    switch (setting) {
      case 'syncScrollEnabled':
        get().setSyncScrollEnabled(enabled);
        break;
      case 'syncNavigationEnabled':
        get().setSyncNavigationEnabled(enabled);
        break;
      case 'syncRefreshEnabled':
        get().setSyncRefreshEnabled(enabled);
        break;
      case 'syncOrientationEnabled':
        get().setSyncOrientationEnabled(enabled);
        break;
    }
  },

  setSyncScrollEnabled: (syncScrollEnabled) =>
    set((state) =>
      state.syncScrollEnabled === syncScrollEnabled
        ? state
        : { syncScrollEnabled, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setSyncNavigationEnabled: (syncNavigationEnabled) =>
    set((state) =>
      state.syncNavigationEnabled === syncNavigationEnabled
        ? state
        : { syncNavigationEnabled, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setSyncRefreshEnabled: (syncRefreshEnabled) =>
    set((state) =>
      state.syncRefreshEnabled === syncRefreshEnabled
        ? state
        : { syncRefreshEnabled, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setSyncOrientationEnabled: (syncOrientationEnabled) =>
    set((state) =>
      state.syncOrientationEnabled === syncOrientationEnabled
        ? state
        : { syncOrientationEnabled, persistenceRevision: state.persistenceRevision + 1 },
    ),

  setShowGrid: (showGrid) =>
    set((state) =>
      state.showGrid === showGrid
        ? state
        : { showGrid, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setSnapToGrid: (snapToGrid) =>
    set((state) =>
      state.snapToGrid === snapToGrid
        ? state
        : { snapToGrid, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setGridSize: (gridSize) => {
    if (!Number.isFinite(gridSize)) return;
    const normalized = Math.round(clamp(gridSize, MIN_COMPARE_GRID_SIZE, MAX_COMPARE_GRID_SIZE));
    set((state) =>
      state.gridSize === normalized
        ? state
        : { gridSize: normalized, persistenceRevision: state.persistenceRevision + 1 },
    );
  },

  setLeftPanelCollapsed: (leftPanelCollapsed) =>
    set((state) =>
      state.leftPanelCollapsed === leftPanelCollapsed
        ? state
        : { leftPanelCollapsed, persistenceRevision: state.persistenceRevision + 1 },
    ),
  setRightPanelCollapsed: (rightPanelCollapsed) =>
    set((state) =>
      state.rightPanelCollapsed === rightPanelCollapsed
        ? state
        : { rightPanelCollapsed, persistenceRevision: state.persistenceRevision + 1 },
    ),

  rotateInstance: (instanceId) =>
    set((state) => {
      const target = state.instances.find((instance) => instance.id === instanceId);
      if (!target) return state;
      const now = Date.now();
      return {
        instances: state.instances.map((instance) =>
          state.syncOrientationEnabled || instance.id === instanceId
            ? {
                ...instance,
                orientation: instance.orientation === 'portrait' ? 'landscape' : 'portrait',
                updatedAt: now,
              }
            : instance,
        ),
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  rotateSelected: () =>
    set((state) => {
      const selected = new Set(state.selectedInstanceIds);
      if (selected.size === 0) return state;
      const now = Date.now();
      let changed = false;
      const instances = state.instances.map((instance) => {
        if (!selected.has(instance.id)) return instance;
        changed = true;
        const orientation: DeviceOrientation =
          instance.orientation === 'portrait' ? 'landscape' : 'portrait';
        return {
          ...instance,
          orientation,
          updatedAt: now,
        };
      });
      return changed ? { instances, persistenceRevision: state.persistenceRevision + 1 } : state;
    }),

  rotateAll: (mode = 'toggle') =>
    set((state) => {
      if (state.instances.length === 0) return state;
      const now = Date.now();
      return {
        instances: state.instances.map((instance) => ({
          ...instance,
          orientation:
            mode === 'toggle'
              ? instance.orientation === 'portrait'
                ? 'landscape'
                : 'portrait'
              : mode,
          updatedAt: now,
        })),
        persistenceRevision: state.persistenceRevision + 1,
      };
    }),

  refreshInstance: (instanceId) => {
    const state = get();
    if (!state.instances.some((instance) => instance.id === instanceId)) return;
    const instanceIds = state.syncRefreshEnabled
      ? state.instances.map((instance) => instance.id)
      : [instanceId];
    set({ runtimeByInstanceId: updateRuntimeReload(state.runtimeByInstanceId, instanceIds) });
  },

  refreshAll: () => {
    const state = get();
    if (state.instances.length === 0) return;
    set({
      runtimeByInstanceId: updateRuntimeReload(
        state.runtimeByInstanceId,
        state.instances.map((instance) => instance.id),
      ),
    });
  },

  setIframeState: (instanceId, iframeStatus, iframeMessage = '') =>
    set((state) => {
      if (!state.instances.some((instance) => instance.id === instanceId)) return state;
      const runtime = state.runtimeByInstanceId[instanceId] ?? createRuntime();
      return {
        runtimeByInstanceId: {
          ...state.runtimeByInstanceId,
          [instanceId]: { ...runtime, iframeStatus, iframeMessage },
        },
      };
    }),

  setSyncCapabilities: (instanceId, capabilities) =>
    set((state) => {
      if (!state.instances.some((instance) => instance.id === instanceId)) return state;
      const runtime = state.runtimeByInstanceId[instanceId] ?? createRuntime();
      return {
        runtimeByInstanceId: {
          ...state.runtimeByInstanceId,
          [instanceId]: { ...runtime, ...capabilities },
        },
      };
    }),
}));

export function serializeCompareStore(state: CompareStoreState): PersistedCompareData {
  return clonePersistedData({
    workspaceMode: state.workspaceMode,
    instances: state.instances,
    canvasOffset: state.canvasOffset,
    canvasScale: state.canvasScale,
    globalUrl: state.globalUrl,
    syncScrollEnabled: state.syncScrollEnabled,
    syncNavigationEnabled: state.syncNavigationEnabled,
    syncRefreshEnabled: state.syncRefreshEnabled,
    syncOrientationEnabled: state.syncOrientationEnabled,
    layoutMode: state.layoutMode,
    showGrid: state.showGrid,
    snapToGrid: state.snapToGrid,
    gridSize: state.gridSize,
    leftPanelCollapsed: state.leftPanelCollapsed,
    rightPanelCollapsed: state.rightPanelCollapsed,
  });
}

export function selectCompareInstanceById(
  instanceId: string,
): (state: CompareStoreState) => CompareDeviceInstance | undefined {
  return (state) => state.instances.find((instance) => instance.id === instanceId);
}
