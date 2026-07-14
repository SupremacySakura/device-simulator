import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCompareRuntimeService } from '../../services/compare-runtime-service';
import { useCompareStore } from '../../stores/compare-store';
import { useDeviceStore } from '../../stores/device-store';
import { useHistoryStore } from '../../stores/history-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type {
  AlignmentAction,
  CompareAutoLayoutMode,
  CompareInstancePatch,
  CompareSyncSetting,
} from '../../types/compare';
import type { DeviceOrientation } from '../../types/device';
import { calculateAlignment } from '../../utils/compare-alignment';
import { normalizeCompareInstanceUrl } from '../../utils/compare-url';
import { AppShell } from '../layout/AppShell';
import { SidebarNavigation } from '../layout/SidebarNavigation';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useToast } from '../common/ToastProvider';
import { AddDeviceDialog, type ComparePresetGroup } from './AddDeviceDialog';
import { CompareCanvas, type CompareCanvasHandle } from './CompareCanvas';
import { ComparePropertyPanel } from './ComparePropertyPanel';
import { CompareSidebar } from './CompareSidebar';
import { CompareToolbar } from './CompareToolbar';

const PRESET_GROUPS: readonly ComparePresetGroup[] = [
  {
    id: 'mobile-basic',
    name: '移动端基础组合',
    description: '紧凑 iPhone、主流 iPhone 与 Android',
    deviceIds: ['iphone-se-3rd-generation', 'iphone-15-pro', 'google-pixel-8'],
  },
  {
    id: 'ios',
    name: 'iOS 组合',
    description: 'iPhone SE、iPhone 15 Pro 与 iPad Pro 11"',
    deviceIds: ['iphone-se-3rd-generation', 'iphone-15-pro', 'ipad-pro-11'],
  },
  {
    id: 'android',
    name: 'Android 组合',
    description: 'Pixel 8 与 Galaxy S24',
    deviceIds: ['google-pixel-8', 'samsung-galaxy-s24'],
  },
  {
    id: 'responsive',
    name: '响应式常用组合',
    description: '手机、平板、1280 与 1440 桌面断点',
    deviceIds: [
      'iphone-se-3rd-generation',
      'iphone-15-pro',
      'google-pixel-8',
      'ipad-pro-11',
      'desktop-1280x720',
      'desktop-1440x900',
    ],
  },
];

type DeleteRequest =
  | { type: 'instance'; instanceId: string }
  | { type: 'selected'; count: number }
  | { type: 'all'; count: number };

interface CompareWorkspaceProps {
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenSingleInstance: (instanceId: string) => void;
}

export function CompareWorkspace({
  onOpenSettings,
  onOpenAbout,
  onOpenSingleInstance,
}: CompareWorkspaceProps) {
  const devices = useDeviceStore((state) => state.devices);
  const toggleFavorite = useDeviceStore((state) => state.toggleFavorite);
  const recentDeviceIds = useHistoryStore((state) => state.recentDeviceIds);
  const defaultSafeAreaVisible = useSimulatorStore((state) => state.showSafeArea);
  const recordDevice = useHistoryStore((state) => state.recordDevice);
  const recordUrl = useHistoryStore((state) => state.recordUrl);
  const recordCombination = useHistoryStore((state) => state.recordCombination);
  const instances = useCompareStore((state) => state.instances);
  const selectedInstanceIds = useCompareStore((state) => state.selectedInstanceIds);
  const canvasScale = useCompareStore((state) => state.canvasScale);
  const globalUrl = useCompareStore((state) => state.globalUrl);
  const syncScrollEnabled = useCompareStore((state) => state.syncScrollEnabled);
  const syncNavigationEnabled = useCompareStore((state) => state.syncNavigationEnabled);
  const syncRefreshEnabled = useCompareStore((state) => state.syncRefreshEnabled);
  const syncOrientationEnabled = useCompareStore((state) => state.syncOrientationEnabled);
  const showGrid = useCompareStore((state) => state.showGrid);
  const snapToGrid = useCompareStore((state) => state.snapToGrid);
  const gridSize = useCompareStore((state) => state.gridSize);
  const leftPanelCollapsed = useCompareStore((state) => state.leftPanelCollapsed);
  const rightPanelCollapsed = useCompareStore((state) => state.rightPanelCollapsed);
  const canvasRef = useRef<CompareCanvasHandle>(null);
  const runtimeService = useMemo(() => createCompareRuntimeService(), []);
  const runtimeMountedRef = useRef(false);
  const { showToast } = useToast();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const [globalUrlInput, setGlobalUrlInput] = useState(globalUrl);
  const [urlError, setUrlError] = useState('');

  const profileMap = useMemo(
    () => Object.fromEntries(devices.map((device) => [device.id, device])),
    [devices],
  );
  const selectedSet = useMemo(() => new Set(selectedInstanceIds), [selectedInstanceIds]);
  const selectedInstances = useMemo(
    () => instances.filter((instance) => selectedSet.has(instance.id)),
    [instances, selectedSet],
  );
  const addedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const instance of instances)
      counts[instance.deviceId] = (counts[instance.deviceId] ?? 0) + 1;
    return counts;
  }, [instances]);

  useEffect(() => setGlobalUrlInput(globalUrl), [globalUrl]);

  useEffect(() => {
    runtimeMountedRef.current = true;
    return () => {
      runtimeMountedRef.current = false;
      queueMicrotask(() => {
        if (!runtimeMountedRef.current) runtimeService.dispose();
      });
    };
  }, [runtimeService]);

  useEffect(
    () =>
      runtimeService.subscribe((event) => {
        const state = useCompareStore.getState();
        if (event.type === 'capability') {
          state.setSyncCapabilities(event.instanceId, {
            scrollSyncSupported: event.capability.scroll,
            navigationSyncSupported: event.capability.navigation,
          });
          return;
        }
        if (document.visibilityState === 'hidden') return;
        if (event.type === 'scroll') {
          if (!state.syncScrollEnabled) return;
          for (const instance of state.instances) {
            if (instance.id === event.instanceId) continue;
            if (state.runtimeByInstanceId[instance.id]?.scrollSyncSupported !== true) continue;
            runtimeService.applyScroll(
              instance.id,
              {
                verticalProgress: event.verticalProgress,
                horizontalProgress: event.horizontalProgress,
              },
              event.syncToken,
            );
          }
          return;
        }
        if (!state.syncNavigationEnabled) return;
        const normalized = normalizeCompareInstanceUrl(event.url);
        if (!normalized) return;
        state.recordInstanceNavigation(event.instanceId, normalized);
        const targetIds = state.instances
          .filter(
            (instance) =>
              instance.id !== event.instanceId &&
              state.runtimeByInstanceId[instance.id]?.navigationSyncSupported === true,
          )
          .map((instance) => instance.id);
        state.updateInstances(targetIds, { url: normalized });
      }),
    [runtimeService],
  );

  const openAddDialog = useCallback((replaceInstanceId?: string) => {
    setReplaceTargetId(replaceInstanceId ?? null);
    setAddDialogOpen(true);
  }, []);

  const addDevice = useCallback(
    (deviceId: string, orientation: DeviceOrientation = 'portrait', copies = 1) => {
      if (replaceTargetId) {
        useCompareStore.getState().replaceInstanceDevice(replaceTargetId, deviceId);
        useCompareStore.getState().setRightPanelCollapsed(false);
        setReplaceTargetId(null);
        setAddDialogOpen(false);
        showToast('设备实例已更换。');
        recordDevice(deviceId);
      } else {
        canvasRef.current?.addDevice(deviceId, orientation, copies);
      }
      if (globalUrl) recordCombination(globalUrl, deviceId);
    },
    [globalUrl, recordCombination, recordDevice, replaceTargetId, showToast],
  );

  const addGroup = useCallback(
    (deviceIds: readonly string[]) => {
      const validIds = deviceIds.filter((id) => profileMap[id]);
      for (const deviceId of validIds) {
        canvasRef.current?.addDevice(deviceId, 'portrait');
      }
      requestAnimationFrame(() => canvasRef.current?.autoLayout('grid'));
    },
    [profileMap],
  );

  const loadAll = useCallback(() => {
    const normalized = normalizeCompareInstanceUrl(globalUrlInput);
    if (normalized === null || normalized === '') {
      setUrlError('URL 格式无效，请检查后重试。');
      return;
    }
    setUrlError('');
    const state = useCompareStore.getState();
    state.setGlobalUrl(normalized);
    state.loadGlobalUrl();
    recordUrl(normalized);
    for (const deviceId of new Set(state.instances.map((instance) => instance.deviceId))) {
      recordCombination(normalized, deviceId);
    }
  }, [globalUrlInput, recordCombination, recordUrl]);

  const loadInstanceUrl = useCallback(
    (instanceId: string, value: string) => {
      const normalized = normalizeCompareInstanceUrl(value);
      if (normalized === null || normalized === '') return false;
      useCompareStore.getState().updateInstance(instanceId, { url: normalized });
      recordUrl(normalized);
      const instance = useCompareStore.getState().instances.find((item) => item.id === instanceId);
      if (instance) recordCombination(normalized, instance.deviceId);
      return true;
    },
    [recordCombination, recordUrl],
  );

  const loadSelectedUrl = useCallback(
    (value: string) => {
      const normalized = normalizeCompareInstanceUrl(value);
      if (normalized === null || normalized === '') {
        showToast('URL 格式无效。', 'error');
        return false;
      }
      const state = useCompareStore.getState();
      state.updateInstances(state.selectedInstanceIds, { url: normalized });
      recordUrl(normalized);
      return true;
    },
    [recordUrl, showToast],
  );

  const applyAlignment = useCallback(
    (action: AlignmentAction) => {
      const state = useCompareStore.getState();
      const selectedIds = new Set(state.selectedInstanceIds);
      const targets = state.instances.filter((instance) => selectedIds.has(instance.id));
      state.applyAlignment(calculateAlignment(targets, profileMap, action));
    },
    [profileMap],
  );

  const toggleSync = useCallback((key: CompareSyncSetting) => {
    const state = useCompareStore.getState();
    state.setSyncSetting(key, !state[key]);
  }, []);

  const autoLayout = useCallback((mode: CompareAutoLayoutMode) => {
    canvasRef.current?.autoLayout(mode);
  }, []);

  const requestDeleteSelected = useCallback(() => {
    const count = useCompareStore.getState().selectedInstanceIds.length;
    if (count > 0) setDeleteRequest({ type: 'selected', count });
  }, []);

  const confirmDelete = () => {
    const request = deleteRequest;
    if (!request) return;
    const state = useCompareStore.getState();
    if (request.type === 'instance') state.removeInstance(request.instanceId);
    else if (request.type === 'selected') state.removeSelectedInstances();
    else state.clearInstances();
    setDeleteRequest(null);
  };

  const deleteMessage =
    deleteRequest?.type === 'instance'
      ? '确定删除当前设备实例吗？设备模板不会被删除。'
      : deleteRequest?.type === 'selected'
        ? `确定删除选中的 ${deleteRequest.count} 个设备实例吗？`
        : `确定清空画布中的 ${deleteRequest?.count ?? 0} 个设备实例吗？此操作不会删除设备模板。`;

  return (
    <>
      <AppShell
        leftPanelCollapsed={leftPanelCollapsed}
        rightPanelCollapsed={rightPanelCollapsed}
        leftPanelId="compare-device-library"
        leftPanelLabel="设备库"
        rightPanelId="compare-property-panel"
        rightPanelLabel="属性面板"
        mainClassName="p-0"
        onExpandLeftPanel={() => useCompareStore.getState().setLeftPanelCollapsed(false)}
        onExpandRightPanel={() => useCompareStore.getState().setRightPanelCollapsed(false)}
        toolbar={
          <CompareToolbar
            globalUrlInput={globalUrlInput}
            urlError={urlError}
            canvasScale={canvasScale}
            syncScrollEnabled={syncScrollEnabled}
            syncNavigationEnabled={syncNavigationEnabled}
            syncRefreshEnabled={syncRefreshEnabled}
            syncOrientationEnabled={syncOrientationEnabled}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            leftPanelCollapsed={leftPanelCollapsed}
            rightPanelCollapsed={rightPanelCollapsed}
            onGlobalUrlInputChange={(value) => {
              setGlobalUrlInput(value);
              setUrlError('');
            }}
            onLoadAll={loadAll}
            onOpenAddDialog={() => openAddDialog()}
            onRefreshAll={() => useCompareStore.getState().refreshAll()}
            onRotateAll={(mode) => useCompareStore.getState().rotateAll(mode)}
            onToggleSyncScroll={() => toggleSync('syncScrollEnabled')}
            onToggleSyncNavigation={() => toggleSync('syncNavigationEnabled')}
            onToggleSyncRefresh={() => toggleSync('syncRefreshEnabled')}
            onToggleSyncOrientation={() => toggleSync('syncOrientationEnabled')}
            onAutoLayout={autoLayout}
            onZoom={(direction) => canvasRef.current?.zoom(direction)}
            onFit={() => canvasRef.current?.fitAll()}
            onResetView={() => canvasRef.current?.resetView()}
            onToggleGrid={() => useCompareStore.getState().setShowGrid(!showGrid)}
            onToggleSnap={() => useCompareStore.getState().setSnapToGrid(!snapToGrid)}
            onClear={() =>
              instances.length > 0 && setDeleteRequest({ type: 'all', count: instances.length })
            }
            onSwitchSingle={() => useCompareStore.getState().setWorkspaceMode('single')}
            onToggleLeftPanel={() =>
              useCompareStore.getState().setLeftPanelCollapsed(!leftPanelCollapsed)
            }
            onToggleRightPanel={() =>
              useCompareStore.getState().setRightPanelCollapsed(!rightPanelCollapsed)
            }
          />
        }
        navigation={
          <SidebarNavigation
            mode="compare"
            onSingle={() => useCompareStore.getState().setWorkspaceMode('single')}
            onCompare={() => undefined}
            onTools={() => showToast('拖动、框选、网格与对齐工具已集成在对比画布中。', 'info')}
            onSettings={onOpenSettings}
            onAbout={onOpenAbout}
          />
        }
        leftPanel={
          <CompareSidebar
            devices={devices}
            recentDeviceIds={recentDeviceIds}
            addedCounts={addedCounts}
            instanceCount={instances.length}
            onAdd={addDevice}
            onOpenAddDialog={() => openAddDialog()}
            onToggleFavorite={toggleFavorite}
            onCollapse={() => useCompareStore.getState().setLeftPanelCollapsed(true)}
          />
        }
        canvas={
          <CompareCanvas
            ref={canvasRef}
            runtimeService={runtimeService}
            defaultSafeAreaVisible={defaultSafeAreaVisible}
            onDeviceAdded={recordDevice}
            onOpenAddDialog={() => openAddDialog()}
            onOpenSingle={onOpenSingleInstance}
            onReplaceInstance={(instanceId) => openAddDialog(instanceId)}
            onRequestDeleteInstance={(instanceId) =>
              setDeleteRequest({ type: 'instance', instanceId })
            }
            onRequestDeleteSelected={requestDeleteSelected}
            onRequestClear={() =>
              instances.length > 0 && setDeleteRequest({ type: 'all', count: instances.length })
            }
          />
        }
        rightPanel={
          <ComparePropertyPanel
            selectedInstances={selectedInstances}
            devices={devices}
            globalUrl={globalUrl}
            canvasScale={canvasScale}
            gridSize={gridSize}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            syncScrollEnabled={syncScrollEnabled}
            syncNavigationEnabled={syncNavigationEnabled}
            syncRefreshEnabled={syncRefreshEnabled}
            syncOrientationEnabled={syncOrientationEnabled}
            onUpdateInstance={(instanceId, patch: CompareInstancePatch) =>
              useCompareStore.getState().updateInstance(instanceId, patch)
            }
            onUpdateSelected={(patch) => {
              const state = useCompareStore.getState();
              state.updateInstances(state.selectedInstanceIds, patch);
            }}
            onRotateSelected={() => useCompareStore.getState().rotateSelected()}
            onLoadInstanceUrl={loadInstanceUrl}
            onLoadSelectedUrl={loadSelectedUrl}
            onDuplicate={(instanceId) => useCompareStore.getState().duplicateInstance(instanceId)}
            onDelete={(instanceId) => setDeleteRequest({ type: 'instance', instanceId })}
            onDeleteSelected={requestDeleteSelected}
            onOpenSingle={onOpenSingleInstance}
            onAlign={applyAlignment}
            onAutoLayout={autoLayout}
            onCanvasScale={(value) => useCompareStore.getState().setCanvasScale(value)}
            onGridSize={(value) => useCompareStore.getState().setGridSize(value)}
            onToggleGrid={() => useCompareStore.getState().setShowGrid(!showGrid)}
            onToggleSnap={() => useCompareStore.getState().setSnapToGrid(!snapToGrid)}
            onToggleSync={toggleSync}
            onCollapse={() => useCompareStore.getState().setRightPanelCollapsed(true)}
          />
        }
      />

      <AddDeviceDialog
        open={addDialogOpen}
        devices={devices}
        recentDeviceIds={recentDeviceIds}
        addedCounts={addedCounts}
        groups={PRESET_GROUPS}
        onAdd={addDevice}
        onAddGroup={addGroup}
        onToggleFavorite={toggleFavorite}
        replaceMode={replaceTargetId !== null}
        onClose={() => {
          setAddDialogOpen(false);
          setReplaceTargetId(null);
        }}
      />

      <ConfirmDialog
        open={deleteRequest !== null}
        title={deleteRequest?.type === 'all' ? '清空对比画布' : '删除设备实例'}
        message={deleteMessage}
        confirmLabel="删除"
        danger
        onConfirm={confirmDelete}
        onClose={() => setDeleteRequest(null)}
      />
    </>
  );
}
