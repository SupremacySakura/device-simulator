import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { AboutDialog } from '../../components/common/AboutDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState } from '../../components/common/StatusState';
import { SettingsDialog } from '../../components/common/SettingsDialog';
import { useToast } from '../../components/common/ToastProvider';
import { DeviceListPanel } from '../../components/device/DeviceListPanel';
import { DevicePropertyPanel } from '../../components/device/DevicePropertyPanel';
import { DeviceEditorDialog } from '../../components/editor/DeviceEditorDialog';
import { ImportExportDialog } from '../../components/editor/ImportExportDialog';
import { AppShell } from '../../components/layout/AppShell';
import { SidebarNavigation } from '../../components/layout/SidebarNavigation';
import { DeviceCanvas } from '../../components/simulator/DeviceCanvas';
import { TopToolbar } from '../../components/toolbar/TopToolbar';
import { useDeviceProfile } from '../../hooks/use-device-profile';
import { useStorageReady } from '../../hooks/use-storage-ready';
import {
  createDeviceExportBlob,
  buildDeviceExportFilename,
} from '../../services/import-export-service';
import { captureElementFromVisibleTab, downloadBlob } from '../../services/screenshot-service';
import { useDeviceStore } from '../../stores/device-store';
import { useHistoryStore } from '../../stores/history-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type { DeviceProfile } from '../../types/device';
import { parseEmbeddedSimulatorContext } from '../../utils/embedded-context';
import { tryNormalizeUrl } from '../../utils/url';

type EditorMode = 'add' | 'edit' | 'duplicate';

interface EditorRequest {
  mode: EditorMode;
  source: DeviceProfile;
}

export function App() {
  const { ready, error: storageError } = useStorageReady();
  const { device } = useDeviceProfile();
  const simulator = useSimulatorStore();
  const addDevice = useDeviceStore((state) => state.addDevice);
  const updateDevice = useDeviceStore((state) => state.updateDevice);
  const removeDevice = useDeviceStore((state) => state.removeDevice);
  const setCurrentDevice = useDeviceStore((state) => state.setCurrentDevice);
  const recordUrl = useHistoryStore((state) => state.recordUrl);
  const recordCombination = useHistoryStore((state) => state.recordCombination);
  const { showToast } = useToast();
  const initializedRef = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [editorRequest, setEditorRequest] = useState<EditorRequest | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<DeviceProfile | null>(null);
  const embeddedContext =
    window.parent === window ? null : parseEmbeddedSimulatorContext(window.location.search);

  useEffect(() => {
    if (!ready || initializedRef.current) return;
    initializedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const requestedDevice = params.get('device');
    if (requestedDevice) setCurrentDevice(requestedDevice);

    const requestedUrl = params.get('url');
    if (requestedUrl) {
      const normalized = tryNormalizeUrl(requestedUrl);
      if (normalized.success) {
        simulator.navigate(normalized.url, true);
        recordUrl(normalized.url);
      } else {
        showToast(normalized.error, 'error');
      }
    } else if (params.get('blank') === '1') {
      simulator.clearUrl();
    } else if (!simulator.url) {
      let demoUrl: string;
      try {
        demoUrl = browser.runtime.getURL('/demo.html');
      } catch {
        demoUrl = `${window.location.origin}/demo.html`;
      }
      simulator.navigate(demoUrl, true);
    }
  }, [ready, recordUrl, setCurrentDevice, showToast, simulator]);

  useEffect(() => {
    if (storageError) showToast(storageError, 'error');
  }, [showToast, storageError]);

  useEffect(() => {
    if (ready && simulator.url && device) recordCombination(simulator.url, device.id);
  }, [device, ready, recordCombination, simulator.url]);

  if (!ready) {
    return (
      <main className="grid h-screen place-items-center bg-[#f7f7f9]">
        <LoadingState title="正在准备 Device Simulator…" />
      </main>
    );
  }

  const requestEdit = (target: DeviceProfile) => {
    setEditorRequest({ mode: target.isSystem ? 'duplicate' : 'edit', source: target });
  };

  const requestDuplicate = (target: DeviceProfile) => {
    setEditorRequest({ mode: 'duplicate', source: target });
  };

  const requestAdd = () => {
    if (!device) return;
    setEditorRequest({ mode: 'add', source: device });
  };

  const exportDevice = (target: DeviceProfile) => {
    try {
      const blob = createDeviceExportBlob([target]);
      downloadBlob(blob, buildDeviceExportFilename(target.name));
      showToast(`已导出 ${target.name}`);
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '设备导出失败。', 'error');
    }
  };

  const takeScreenshot = async () => {
    const target = document.querySelector<HTMLElement>('[data-device-capture-target="true"]');
    if (!target || !device) {
      showToast('设备预览尚未就绪。', 'error');
      return;
    }
    try {
      const blob = await captureElementFromVisibleTab(target);
      const name = device.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-');
      downloadBlob(blob, `device-simulator-${name}.png`);
      showToast('当前可视设备区域截图已保存。');
    } catch (reason) {
      showToast(reason instanceof Error ? reason.message : '截图失败。', 'error');
    }
  };

  return (
    <>
      <AppShell
        toolbar={
          <TopToolbar
            onScreenshot={() => void takeScreenshot()}
            onCompare={() => showToast('对比模式将在后续版本开放。', 'info')}
            onSettings={() => setSettingsOpen(true)}
            {...(embeddedContext
              ? {
                  onClose: () =>
                    window.parent.postMessage(
                      {
                        source: 'device-simulator',
                        type: 'CLOSE_IN_PAGE_SIMULATOR',
                        sessionId: embeddedContext.sessionId,
                      },
                      embeddedContext.parentOrigin,
                    ),
                }
              : {})}
          />
        }
        navigation={
          <SidebarNavigation
            onCompare={() => showToast('对比模式将在后续版本开放。', 'info')}
            onTools={() => showToast('摄像头、标尺和网格工具已集成在画布中。', 'info')}
            onSettings={() => setSettingsOpen(true)}
            onAbout={() => setAboutOpen(true)}
          />
        }
        leftPanel={
          simulator.leftPanelCollapsed ? undefined : (
            <DeviceListPanel
              onAdd={requestAdd}
              onEdit={requestEdit}
              onDuplicate={requestDuplicate}
              onExport={exportDevice}
              onDelete={setDeleteDevice}
              onImportExport={() => setImportExportOpen(true)}
            />
          )
        }
        canvas={<DeviceCanvas />}
        rightPanel={
          simulator.rightPanelCollapsed ? undefined : (
            <DevicePropertyPanel onEdit={requestEdit} onDuplicate={requestDuplicate} />
          )
        }
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />

      <ConfirmDialog
        open={deleteDevice !== null}
        title="删除自定义设备"
        message={`确定删除“${deleteDevice?.name ?? ''}”吗？此操作无法撤销。`}
        confirmLabel="删除"
        danger
        onClose={() => setDeleteDevice(null)}
        onConfirm={() => {
          if (deleteDevice && removeDevice(deleteDevice.id)) showToast('自定义设备已删除。');
          setDeleteDevice(null);
        }}
      />

      {editorRequest ? (
        <DeviceEditorDialog
          open
          mode={editorRequest.mode}
          source={editorRequest.source}
          onClose={() => setEditorRequest(null)}
          onSave={(savedDevice) => {
            if (editorRequest.mode === 'edit') updateDevice(savedDevice);
            else addDevice(savedDevice);
            simulator.setEditMode(true);
            setEditorRequest(null);
          }}
        />
      ) : null}

      <ImportExportDialog
        open={importExportOpen}
        currentDevice={device}
        onClose={() => setImportExportOpen(false)}
      />
    </>
  );
}
