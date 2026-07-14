import { Copy, Grid3X3, Maximize, Plus, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type {
  CompareRuntimeService,
  CompareIframeBinding,
} from '../../services/compare-runtime-service';
import { useCompareStore } from '../../stores/compare-store';
import { useDeviceStore } from '../../stores/device-store';
import type {
  CanvasPosition,
  CanvasTransform,
  CompareAutoLayoutMode,
  CompareDeviceInstance,
  CompareInstanceRuntime,
} from '../../types/compare';
import type { DeviceOrientation, DeviceProfile } from '../../types/device';
import type { IframeStatus } from '../../types/simulator';
import { boundsIntersect, calculateFitTransform, normalizeBounds } from '../../utils/canvas-bounds';
import { calculateZoomedTransform, screenToCanvasPoint } from '../../utils/canvas-coordinate';
import { calculateAutoLayout } from '../../utils/compare-layout';
import { getDeviceOuterSize, getInstanceBoundsOrFallback } from '../../utils/instance-size';
import { Button } from '../common/Button';
import { CanvasGrid } from './CanvasGrid';
import { CanvasSelectionBox } from './CanvasSelectionBox';
import { CompareContextMenu, type CompareContextMenuItem } from './CompareContextMenu';
import { CompareDeviceNode } from './CompareDeviceNode';
import { COMPARE_DEVICE_DRAG_TYPE } from './CompareDeviceLibrary';

const EMPTY_RUNTIME: CompareInstanceRuntime = {
  iframeStatus: 'idle',
  iframeMessage: '',
  reloadKey: 0,
  observedUrl: null,
  scrollSyncSupported: null,
  navigationSyncSupported: null,
};

type Interaction =
  | {
      type: 'pan';
      pointerId: number;
      start: CanvasPosition;
      origin: CanvasTransform;
      next: CanvasTransform;
    }
  | {
      type: 'selection';
      pointerId: number;
      startClient: CanvasPosition;
      startCanvas: CanvasPosition;
      baseSelection: string[];
    }
  | {
      type: 'node-drag';
      pointerId: number;
      startClient: CanvasPosition;
      instanceIds: string[];
      origins: Record<string, CanvasPosition>;
      next: Record<string, CanvasPosition>;
    };

interface SelectionBoxState {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ContextState {
  x: number;
  y: number;
  instanceId?: string;
}

export interface CompareCanvasHandle {
  addDevice: (
    deviceId: string,
    orientation?: DeviceOrientation,
    copies?: number,
    screenPoint?: CanvasPosition,
  ) => string[];
  fitAll: () => void;
  resetView: () => void;
  zoom: (direction: -1 | 1) => void;
  autoLayout: (mode: CompareAutoLayoutMode) => void;
}

interface CompareCanvasProps {
  runtimeService: CompareRuntimeService;
  defaultSafeAreaVisible: boolean;
  onDeviceAdded: (deviceId: string) => void;
  onOpenAddDialog: () => void;
  onOpenSingle: (instanceId: string) => void;
  onReplaceInstance: (instanceId: string) => void;
  onRequestDeleteInstance: (instanceId: string) => void;
  onRequestDeleteSelected: () => void;
  onRequestClear: () => void;
}

interface RuntimeBoundNodeProps {
  service: CompareRuntimeService;
  instance: CompareDeviceInstance;
  profile: DeviceProfile | undefined;
  runtime: CompareInstanceRuntime;
  position: CanvasPosition;
  selected: boolean;
  active: boolean;
  dragging: boolean;
  globalUrl: string;
  syncScrollEnabled: boolean;
  syncNavigationEnabled: boolean;
  onSelect: (instanceId: string, additive: boolean) => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, instanceId: string) => void;
  onStatusChange: CompareCanvasNodeCallbacks['onStatusChange'];
  onRefresh: CompareCanvasNodeCallbacks['onRefresh'];
  onRotate: CompareCanvasNodeCallbacks['onRotate'];
  onDuplicate: CompareCanvasNodeCallbacks['onDuplicate'];
  onResetScale: CompareCanvasNodeCallbacks['onResetScale'];
  onDelete: CompareCanvasNodeCallbacks['onDelete'];
  onOpenSingle: CompareCanvasNodeCallbacks['onOpenSingle'];
  onReplace: CompareCanvasNodeCallbacks['onReplace'];
  onContextMenu: CompareCanvasNodeCallbacks['onContextMenu'];
}

interface CompareCanvasNodeCallbacks {
  onStatusChange: (instanceId: string, status: IframeStatus, message?: string) => void;
  onRefresh: (instanceId: string) => void;
  onRotate: (instanceId: string) => void;
  onDuplicate: (instanceId: string) => void;
  onResetScale: (instanceId: string) => void;
  onDelete: (instanceId: string) => void;
  onOpenSingle: (instanceId: string) => void;
  onReplace: (instanceId: string) => void;
  onContextMenu: (event: React.MouseEvent, instanceId: string) => void;
}

function RuntimeBoundNode({ service, ...props }: RuntimeBoundNodeProps) {
  const [binding] = useState<CompareIframeBinding>(() =>
    service.registerInstance(props.instance.id),
  );
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      queueMicrotask(() => {
        if (!mountedRef.current) service.unregisterInstance(props.instance.id);
      });
    };
  }, [props.instance.id, service]);
  return (
    <CompareDeviceNode {...props} iframeName={binding.iframeName} iframeRef={binding.iframeRef} />
  );
}

function isShortcutExcludedTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest(
        'input, textarea, select, button, a, summary, [role="button"], [role="menuitem"]',
      ) !== null)
  );
}

function clampScale(value: number): number {
  return Math.min(2, Math.max(0.2, value));
}

function resetInstanceScale(instanceId: string): void {
  useCompareStore.getState().updateInstance(instanceId, { scale: 1 });
}

function transformFromStore(offset: CanvasPosition, scale: number): CanvasTransform {
  return { offsetX: offset.x, offsetY: offset.y, scale };
}

export const CompareCanvas = forwardRef<CompareCanvasHandle, CompareCanvasProps>(
  function CompareCanvas(
    {
      runtimeService,
      defaultSafeAreaVisible,
      onDeviceAdded,
      onOpenAddDialog,
      onOpenSingle,
      onReplaceInstance,
      onRequestDeleteInstance,
      onRequestDeleteSelected,
      onRequestClear,
    },
    ref,
  ) {
    const instances = useCompareStore((state) => state.instances);
    const selectedInstanceIds = useCompareStore((state) => state.selectedInstanceIds);
    const runtimeByInstanceId = useCompareStore((state) => state.runtimeByInstanceId);
    const canvasOffset = useCompareStore((state) => state.canvasOffset);
    const canvasScale = useCompareStore((state) => state.canvasScale);
    const globalUrl = useCompareStore((state) => state.globalUrl);
    const showGrid = useCompareStore((state) => state.showGrid);
    const snapToGrid = useCompareStore((state) => state.snapToGrid);
    const gridSize = useCompareStore((state) => state.gridSize);
    const syncScrollEnabled = useCompareStore((state) => state.syncScrollEnabled);
    const syncNavigationEnabled = useCompareStore((state) => state.syncNavigationEnabled);
    const devices = useDeviceStore((state) => state.devices);

    const viewportRef = useRef<HTMLDivElement>(null);
    const interactionRef = useRef<Interaction | null>(null);
    const transformRef = useRef(transformFromStore(canvasOffset, canvasScale));
    const frameRef = useRef<number | null>(null);
    const wheelCommitRef = useRef<number | null>(null);
    const spacePressedRef = useRef(false);
    const [viewTransform, setViewTransform] = useState(transformRef.current);
    const [selectionBox, setSelectionBox] = useState<SelectionBoxState | null>(null);
    const [draftPositions, setDraftPositions] = useState<Record<string, CanvasPosition>>({});
    const [contextMenu, setContextMenu] = useState<ContextState | null>(null);
    const [isSpacePressed, setIsSpacePressed] = useState(false);

    const profileMap = useMemo(
      () => Object.fromEntries(devices.map((device) => [device.id, device])),
      [devices],
    );
    const selectedSet = useMemo(() => new Set(selectedInstanceIds), [selectedInstanceIds]);
    const activeInstanceId = selectedInstanceIds.at(-1);

    const setTransformLocally = useCallback((transform: CanvasTransform) => {
      transformRef.current = transform;
      setViewTransform(transform);
    }, []);

    const commitTransform = useCallback((transform = transformRef.current) => {
      useCompareStore.getState().setCanvasTransform(transform);
    }, []);

    useEffect(() => {
      if (interactionRef.current?.type === 'pan') return;
      const next = transformFromStore(canvasOffset, canvasScale);
      transformRef.current = next;
      setViewTransform(next);
    }, [canvasOffset, canvasScale]);

    const fitAll = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const transform = calculateFitTransform(
        useCompareStore.getState().instances,
        profileMap,
        { width: viewport.clientWidth, height: viewport.clientHeight },
        72,
      );
      setTransformLocally(transform);
      commitTransform(transform);
    }, [commitTransform, profileMap, setTransformLocally]);

    const resetView = useCallback(() => {
      const transform = { offsetX: 0, offsetY: 0, scale: 1 };
      setTransformLocally(transform);
      commitTransform(transform);
    }, [commitTransform, setTransformLocally]);

    const zoomAt = useCallback(
      (nextScale: number, screenPoint?: CanvasPosition) => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const rect = viewport.getBoundingClientRect();
        const anchor = screenPoint ?? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        const next = calculateZoomedTransform(
          transformRef.current,
          clampScale(nextScale),
          anchor,
          rect,
        );
        setTransformLocally(next);
        commitTransform(next);
      },
      [commitTransform, setTransformLocally],
    );

    const zoom = useCallback(
      (direction: -1 | 1) => {
        zoomAt(transformRef.current.scale + direction * 0.1);
      },
      [zoomAt],
    );

    const addDevice = useCallback(
      (
        deviceId: string,
        orientation: DeviceOrientation = 'portrait',
        copies = 1,
        screenPoint?: CanvasPosition,
      ) => {
        const viewport = viewportRef.current;
        const profile = profileMap[deviceId];
        if (!viewport || !profile) return [];
        const rect = viewport.getBoundingClientRect();
        const anchor = screenToCanvasPoint(
          screenPoint ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          transformRef.current,
          rect,
        );
        const size = getDeviceOuterSize(profile, orientation, true);
        const count = Math.min(20, Math.max(1, Math.floor(copies)));
        const ids: string[] = [];
        const occupied = useCompareStore
          .getState()
          .instances.map((instance) => ({ ...instance.position }));
        const basePosition = {
          x: anchor.x - size.width / 2,
          y: anchor.y - size.height / 2,
        };
        for (let index = 0; index < count; index += 1) {
          let offset = index * 40;
          while (
            offset < 1_200 &&
            occupied.some(
              (position) =>
                Math.abs(position.x - (basePosition.x + offset)) < 24 &&
                Math.abs(position.y - (basePosition.y + offset)) < 24,
            )
          ) {
            offset += 40;
          }
          const position = {
            x: basePosition.x + offset,
            y: basePosition.y + offset,
          };
          occupied.push(position);
          ids.push(
            useCompareStore.getState().addInstance(deviceId, {
              orientation,
              position,
              safeAreaVisible: defaultSafeAreaVisible,
            }),
          );
        }
        if (ids.length > 0) onDeviceAdded(deviceId);
        return ids;
      },
      [defaultSafeAreaVisible, onDeviceAdded, profileMap],
    );

    const autoLayout = useCallback(
      (mode: CompareAutoLayoutMode) => {
        const current = useCompareStore.getState().instances;
        const positions = calculateAutoLayout(current, profileMap, mode, {
          gap: 72,
          origin: { x: 80, y: 80 },
        });
        useCompareStore.getState().applyLayout(mode, positions);
        const arranged = current.map((instance) => ({
          ...instance,
          position: positions[instance.id] ?? instance.position,
        }));
        const viewport = viewportRef.current;
        if (!viewport) return;
        const transform = calculateFitTransform(
          arranged,
          profileMap,
          { width: viewport.clientWidth, height: viewport.clientHeight },
          72,
        );
        setTransformLocally(transform);
        commitTransform(transform);
      },
      [commitTransform, profileMap, setTransformLocally],
    );

    useImperativeHandle(ref, () => ({ addDevice, fitAll, resetView, zoom, autoLayout }), [
      addDevice,
      autoLayout,
      fitAll,
      resetView,
      zoom,
    ]);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const current = transformRef.current;
        let next: CanvasTransform;
        if (event.ctrlKey || event.metaKey) {
          const nextScale = clampScale(current.scale * Math.exp(-event.deltaY * 0.002));
          next = calculateZoomedTransform(
            current,
            nextScale,
            { x: event.clientX, y: event.clientY },
            viewport.getBoundingClientRect(),
          );
        } else {
          next = {
            ...current,
            offsetX: current.offsetX - event.deltaX,
            offsetY: current.offsetY - event.deltaY,
          };
        }
        setTransformLocally(next);
        if (wheelCommitRef.current !== null) window.clearTimeout(wheelCommitRef.current);
        wheelCommitRef.current = window.setTimeout(() => {
          wheelCommitRef.current = null;
          commitTransform();
        }, 140);
      };
      viewport.addEventListener('wheel', handleWheel, { capture: true, passive: false });
      return () => {
        viewport.removeEventListener('wheel', handleWheel, { capture: true });
        if (wheelCommitRef.current !== null) window.clearTimeout(wheelCommitRef.current);
      };
    }, [commitTransform, setTransformLocally]);

    const handleSelect = useCallback((instanceId: string, additive: boolean) => {
      const state = useCompareStore.getState();
      if (additive) state.selectInstance(instanceId, 'toggle');
      else if (
        !state.selectedInstanceIds.includes(instanceId) ||
        state.selectedInstanceIds.length === 1
      ) {
        state.selectInstance(instanceId, 'replace');
      }
      state.bringToFront(instanceId);
    }, []);

    const startNodeDrag = useCallback(
      (event: ReactPointerEvent<HTMLElement>, instanceId: string) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const state = useCompareStore.getState();
        const ids = state.selectedInstanceIds.includes(instanceId)
          ? state.selectedInstanceIds
          : [instanceId];
        const origins: Record<string, CanvasPosition> = {};
        for (const id of ids) {
          const instance = state.instances.find((item) => item.id === id);
          if (instance) origins[id] = { ...instance.position };
        }
        interactionRef.current = {
          type: 'node-drag',
          pointerId: event.pointerId,
          startClient: { x: event.clientX, y: event.clientY },
          instanceIds: Object.keys(origins),
          origins,
          next: origins,
        };
        setDraftPositions(origins);
      },
      [],
    );

    const startCanvasInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest('[data-compare-node="true"]')) return;
      if (event.button !== 0 && event.button !== 1) return;
      setContextMenu(null);
      const shouldPan = event.button === 1 || (event.button === 0 && spacePressedRef.current);
      const viewport = viewportRef.current;
      if (!viewport) return;
      event.preventDefault();
      viewport.focus({ preventScroll: true });
      viewport.setPointerCapture(event.pointerId);
      if (shouldPan) {
        interactionRef.current = {
          type: 'pan',
          pointerId: event.pointerId,
          start: { x: event.clientX, y: event.clientY },
          origin: transformRef.current,
          next: transformRef.current,
        };
        return;
      }
      const rect = viewport.getBoundingClientRect();
      const startClient = { x: event.clientX, y: event.clientY };
      interactionRef.current = {
        type: 'selection',
        pointerId: event.pointerId,
        startClient,
        startCanvas: screenToCanvasPoint(startClient, transformRef.current, rect),
        baseSelection: event.shiftKey ? [...useCompareStore.getState().selectedInstanceIds] : [],
      };
      if (!event.shiftKey) useCompareStore.getState().clearSelection();
      setSelectionBox({
        left: event.clientX - rect.left,
        top: event.clientY - rect.top,
        width: 0,
        height: 0,
      });
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      event.preventDefault();
      if (interaction.type === 'pan') {
        interaction.next = {
          ...interaction.origin,
          offsetX: interaction.origin.offsetX + event.clientX - interaction.start.x,
          offsetY: interaction.origin.offsetY + event.clientY - interaction.start.y,
        };
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          const current = interactionRef.current;
          if (current?.type === 'pan') setTransformLocally(current.next);
        });
        return;
      }
      if (interaction.type === 'node-drag') {
        const deltaX = (event.clientX - interaction.startClient.x) / transformRef.current.scale;
        const deltaY = (event.clientY - interaction.startClient.y) / transformRef.current.scale;
        const next: Record<string, CanvasPosition> = {};
        for (const id of interaction.instanceIds) {
          const origin = interaction.origins[id];
          if (!origin) continue;
          const x = origin.x + deltaX;
          const y = origin.y + deltaY;
          next[id] = snapToGrid
            ? { x: Math.round(x / gridSize) * gridSize, y: Math.round(y / gridSize) * gridSize }
            : { x, y };
        }
        interaction.next = next;
        if (frameRef.current !== null) return;
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          const current = interactionRef.current;
          if (current?.type === 'node-drag') setDraftPositions(current.next);
        });
        return;
      }

      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const currentClient = { x: event.clientX, y: event.clientY };
      const currentCanvas = screenToCanvasPoint(currentClient, transformRef.current, rect);
      const selectionBounds = normalizeBounds(interaction.startCanvas, currentCanvas);
      const selectedIds: string[] = [];
      for (const instance of useCompareStore.getState().instances) {
        const profile = profileMap[instance.deviceId];
        const instanceBounds = getInstanceBoundsOrFallback(instance, profile);
        if (boundsIntersect(instanceBounds, selectionBounds)) {
          selectedIds.push(instance.id);
        }
      }
      useCompareStore
        .getState()
        .selectInstances([...new Set([...interaction.baseSelection, ...selectedIds])]);
      setSelectionBox({
        left: Math.min(interaction.startClient.x, currentClient.x) - rect.left,
        top: Math.min(interaction.startClient.y, currentClient.y) - rect.top,
        width: Math.abs(currentClient.x - interaction.startClient.x),
        height: Math.abs(currentClient.y - interaction.startClient.y),
      });
    };

    const finishPointerInteraction = (event: ReactPointerEvent<HTMLDivElement>) => {
      const interaction = interactionRef.current;
      if (!interaction || interaction.pointerId !== event.pointerId) return;
      interactionRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (interaction.type === 'pan') {
        setTransformLocally(interaction.next);
        commitTransform(interaction.next);
      } else if (interaction.type === 'node-drag') {
        setDraftPositions({});
        useCompareStore.getState().commitInstancePositions(interaction.next);
      } else {
        setSelectionBox(null);
      }
      const viewport = viewportRef.current;
      if (viewport?.hasPointerCapture(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
    };

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (isShortcutExcludedTarget(event.target)) return;
        if (event.code === 'Space') {
          event.preventDefault();
          spacePressedRef.current = true;
          setIsSpacePressed(true);
          return;
        }
        const command = event.metaKey || event.ctrlKey;
        const state = useCompareStore.getState();
        if (event.key === 'Escape') {
          event.preventDefault();
          const interaction = interactionRef.current;
          interactionRef.current = null;
          if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
          }
          if (interaction?.type === 'pan') setTransformLocally(interaction.origin);
          const viewport = viewportRef.current;
          if (interaction && viewport?.hasPointerCapture(interaction.pointerId)) {
            viewport.releasePointerCapture(interaction.pointerId);
          }
          spacePressedRef.current = false;
          setIsSpacePressed(false);
          setContextMenu(null);
          setSelectionBox(null);
          setDraftPositions({});
          state.clearSelection();
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
          if (state.selectedInstanceIds.length === 0) return;
          event.preventDefault();
          onRequestDeleteSelected();
        } else if (command && event.key.toLocaleLowerCase() === 'd') {
          event.preventDefault();
          state.duplicateSelectedInstances();
        } else if (command && event.key.toLocaleLowerCase() === 'a') {
          event.preventDefault();
          state.selectAll();
        } else if (command && event.key === '0') {
          event.preventDefault();
          fitAll();
        } else if (command && (event.key === '+' || event.key === '=')) {
          event.preventDefault();
          zoom(1);
        } else if (command && (event.key === '-' || event.key === '_')) {
          event.preventDefault();
          zoom(-1);
        } else if (event.key.startsWith('Arrow') && state.selectedInstanceIds.length > 0) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          const delta =
            event.key === 'ArrowLeft'
              ? { x: -step, y: 0 }
              : event.key === 'ArrowRight'
                ? { x: step, y: 0 }
                : event.key === 'ArrowUp'
                  ? { x: 0, y: -step }
                  : { x: 0, y: step };
          state.translateSelected(delta);
        }
      };
      const handleKeyUp = (event: KeyboardEvent) => {
        if (event.code !== 'Space') return;
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      };
      const releaseSpace = () => {
        spacePressedRef.current = false;
        setIsSpacePressed(false);
      };
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') releaseSpace();
      };
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      window.addEventListener('blur', releaseSpace);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
        window.removeEventListener('blur', releaseSpace);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [fitAll, onRequestDeleteSelected, setTransformLocally, zoom]);

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const deviceId =
        event.dataTransfer.getData(COMPARE_DEVICE_DRAG_TYPE) ||
        event.dataTransfer.getData('text/plain');
      if (profileMap[deviceId])
        addDevice(deviceId, 'portrait', 1, { x: event.clientX, y: event.clientY });
    };

    const handleNodeContextMenu = useCallback((event: React.MouseEvent, instanceId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const state = useCompareStore.getState();
      if (!state.selectedInstanceIds.includes(instanceId)) state.selectInstance(instanceId);
      setContextMenu({ x: event.clientX, y: event.clientY, instanceId });
    }, []);

    const contextItems = useMemo<CompareContextMenuItem[]>(() => {
      const instanceId = contextMenu?.instanceId;
      if (instanceId) {
        const instance = instances.find((item) => item.id === instanceId);
        return [
          {
            id: 'refresh',
            label: '刷新',
            icon: <RefreshCw className="size-4" />,
            onSelect: () => useCompareStore.getState().refreshInstance(instanceId),
          },
          {
            id: 'duplicate',
            label: '复制',
            icon: <Copy className="size-4" />,
            onSelect: () => useCompareStore.getState().duplicateInstance(instanceId),
          },
          {
            id: 'rotate',
            label: '切换方向',
            icon: <RotateCw className="size-4" />,
            onSelect: () => useCompareStore.getState().rotateInstance(instanceId),
          },
          {
            id: 'safe',
            label: instance?.safeAreaVisible ? '隐藏安全区' : '显示安全区',
            onSelect: () =>
              instance &&
              useCompareStore
                .getState()
                .updateInstance(instanceId, { safeAreaVisible: !instance.safeAreaVisible }),
          },
          {
            id: 'frame',
            label: instance?.frameVisible ? '隐藏设备边框' : '显示设备边框',
            onSelect: () =>
              instance &&
              useCompareStore
                .getState()
                .updateInstance(instanceId, { frameVisible: !instance.frameVisible }),
          },
          {
            id: 'replace',
            label: '更换设备',
            onSelect: () => onReplaceInstance(instanceId),
          },
          { id: 'single', label: '在单设备模式中打开', onSelect: () => onOpenSingle(instanceId) },
          {
            id: 'front',
            label: '置于顶层',
            onSelect: () => useCompareStore.getState().bringToFront(instanceId),
          },
          {
            id: 'delete',
            label: '删除',
            icon: <Trash2 className="size-4" />,
            danger: true,
            separatorBefore: true,
            onSelect: () => onRequestDeleteInstance(instanceId),
          },
        ];
      }
      return [
        {
          id: 'add',
          label: '添加设备',
          icon: <Plus className="size-4" />,
          onSelect: onOpenAddDialog,
        },
        {
          id: 'layout',
          label: '网格自动排列',
          icon: <Grid3X3 className="size-4" />,
          disabled: instances.length === 0,
          onSelect: () => autoLayout('grid'),
        },
        {
          id: 'fit',
          label: '适应全部设备',
          icon: <Maximize className="size-4" />,
          disabled: instances.length === 0,
          onSelect: fitAll,
        },
        { id: 'reset', label: '重置视图', onSelect: resetView },
        {
          id: 'grid',
          label: showGrid ? '隐藏网格' : '显示网格',
          icon: <Grid3X3 className="size-4" />,
          onSelect: () => useCompareStore.getState().setShowGrid(!showGrid),
        },
        {
          id: 'clear',
          label: '清空画布',
          icon: <Trash2 className="size-4" />,
          danger: true,
          disabled: instances.length === 0,
          separatorBefore: true,
          onSelect: onRequestClear,
        },
      ];
    }, [
      autoLayout,
      contextMenu,
      fitAll,
      instances,
      onOpenAddDialog,
      onOpenSingle,
      onReplaceInstance,
      onRequestClear,
      onRequestDeleteInstance,
      resetView,
      showGrid,
    ]);

    return (
      <section
        ref={viewportRef}
        role="application"
        tabIndex={0}
        aria-label="多设备对比无限画布"
        className={`relative size-full min-w-0 overflow-hidden bg-[#f8f8fb] outline-none overscroll-none ${
          interactionRef.current?.type === 'pan'
            ? 'cursor-grabbing'
            : isSpacePressed
              ? 'cursor-grab'
              : 'cursor-default'
        }`}
        onPointerDown={startCanvasInteraction}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
        onLostPointerCapture={finishPointerInteraction}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={handleDrop}
        onContextMenu={(event) => {
          if ((event.target as HTMLElement).closest('[data-compare-node="true"]')) return;
          event.preventDefault();
          setContextMenu({ x: event.clientX, y: event.clientY });
        }}
      >
        <CanvasGrid
          visible={showGrid}
          gridSize={gridSize}
          scale={viewTransform.scale}
          offsetX={viewTransform.offsetX}
          offsetY={viewTransform.offsetY}
        />

        <div
          data-compare-canvas-content="true"
          className="absolute top-0 left-0"
          style={{
            transform: `translate3d(${viewTransform.offsetX}px, ${viewTransform.offsetY}px, 0) scale(${viewTransform.scale})`,
            transformOrigin: '0 0',
            willChange: interactionRef.current?.type === 'pan' ? 'transform' : undefined,
          }}
        >
          {instances.map((instance) => {
            const position = draftPositions[instance.id] ?? instance.position;
            return (
              <RuntimeBoundNode
                key={instance.id}
                service={runtimeService}
                instance={instance}
                profile={profileMap[instance.deviceId]}
                runtime={runtimeByInstanceId[instance.id] ?? EMPTY_RUNTIME}
                position={position}
                selected={selectedSet.has(instance.id)}
                active={activeInstanceId === instance.id}
                dragging={Object.hasOwn(draftPositions, instance.id)}
                globalUrl={globalUrl}
                syncScrollEnabled={syncScrollEnabled}
                syncNavigationEnabled={syncNavigationEnabled}
                onSelect={handleSelect}
                onDragStart={startNodeDrag}
                onStatusChange={useCompareStore.getState().setIframeState}
                onRefresh={useCompareStore.getState().refreshInstance}
                onRotate={useCompareStore.getState().rotateInstance}
                onDuplicate={useCompareStore.getState().duplicateInstance}
                onResetScale={resetInstanceScale}
                onDelete={onRequestDeleteInstance}
                onOpenSingle={onOpenSingle}
                onReplace={onReplaceInstance}
                onContextMenu={handleNodeContextMenu}
              />
            );
          })}
        </div>

        {isSpacePressed ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-40 cursor-grab touch-none active:cursor-grabbing"
          />
        ) : null}

        {selectionBox ? <CanvasSelectionBox {...selectionBox} /> : null}

        {instances.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center p-8 text-center">
            <div className="max-w-md rounded-2xl border border-dashed border-[#d9d5eb] bg-white/88 px-8 py-10 shadow-sm backdrop-blur-sm">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f0edff] text-[#6547f5]">
                <Grid3X3 className="size-6" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-[#303139]">还没有添加对比设备</h2>
              <p className="mt-2 text-xs leading-5 text-[#777984]">
                添加多个设备后，可以同时检查不同屏幕尺寸下的页面效果。
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button variant="primary" onClick={onOpenAddDialog}>
                  <Plus className="size-4" /> 添加第一个设备
                </Button>
                <Button onClick={onOpenAddDialog}>添加常用设备组合</Button>
              </div>
            </div>
          </div>
        ) : null}

        {instances.length > 8 ? (
          <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-[#f1d9a5] bg-[#fff9eb]/95 px-3 py-2 text-[11px] text-[#8a6523] shadow-sm backdrop-blur-sm">
            当前已打开 {instances.length} 个 iframe，可能占用较多内存；建议同时保留 8 个以内。
          </div>
        ) : null}

        <div className="pointer-events-none absolute right-3 bottom-3 z-50 rounded-lg border border-[#e2e2e8] bg-white/92 px-2.5 py-1.5 text-[10px] text-[#777984] shadow-sm backdrop-blur-sm">
          中键 / Space + 拖动平移 · Ctrl/Cmd + 滚轮缩放 · 空白拖动框选
        </div>

        {contextMenu ? (
          <CompareContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextItems}
            onClose={() => setContextMenu(null)}
          />
        ) : null}
      </section>
    );
  },
);
