import { Copy, LockKeyhole, PanelRightClose, Pencil, RotateCw, Smartphone } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  createCameraFromTemplate,
  createHomeIndicator,
  type CameraTemplateId,
} from '../../services/device-service';
import { useDeviceStore } from '../../stores/device-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type {
  DeviceCategory,
  DeviceProfile,
  DeviceViewportConfig,
  SafeAreaInsets,
} from '../../types/device';
import { getDeviceFrameInsets, getDeviceViewport } from '../../utils/device-profile';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { CameraListEditor } from '../editor/CameraListEditor';
import { DisplayFeatureEditor } from '../editor/DisplayFeatureEditor';
import { SafeAreaEditor } from '../editor/SafeAreaEditor';
import { DeviceConfidenceBadge } from './DeviceConfidenceBadge';

interface DevicePropertyPanelProps {
  onEdit: (device: DeviceProfile) => void;
  onDuplicate: (device: DeviceProfile) => void;
  onCollapse: () => void;
}

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  phone: '手机',
  tablet: '平板',
  desktop: '桌面',
  foldable: '折叠屏',
  custom: '自定义',
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 py-1.5 text-xs">
      <dt className="text-[#777984]">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-[#35363d]">{children}</dd>
    </div>
  );
}

function cloneSafeArea(value: SafeAreaInsets): SafeAreaInsets {
  return { ...value };
}

export function DevicePropertyPanel({ onEdit, onDuplicate, onCollapse }: DevicePropertyPanelProps) {
  const device = useDeviceStore((state) =>
    state.devices.find((item) => item.id === state.currentDeviceId),
  );
  const orientation = useSimulatorStore((state) => state.orientation);
  const selection = useSimulatorStore((state) => state.selection);
  const setSelection = useSimulatorStore((state) => state.setSelection);
  const safeAreaBaseline = useRef<{
    key: string;
    value: SafeAreaInsets;
  } | null>(null);

  useEffect(() => {
    setSelection(null);
  }, [device?.id, setSelection]);

  const viewport = device ? getDeviceViewport(device, orientation) : null;
  const baselineKey = device ? `${device.id}:${orientation}` : '';
  if (
    viewport &&
    (safeAreaBaseline.current === null || safeAreaBaseline.current.key !== baselineKey)
  ) {
    safeAreaBaseline.current = {
      key: baselineKey,
      value: cloneSafeArea(viewport.safeArea),
    };
  }

  if (!device || !viewport) {
    return (
      <aside
        id="device-property-panel"
        className="relative grid h-full w-[340px] shrink-0 place-items-center border-l border-[#e7e7ec] bg-white p-6 text-center"
        aria-label="设备属性面板"
      >
        <IconButton
          label="收起设备信息"
          size="sm"
          aria-controls="device-property-panel"
          aria-expanded="true"
          className="absolute top-3 right-3 max-[1160px]:hidden"
          onClick={onCollapse}
        >
          <PanelRightClose className="size-4" />
        </IconButton>
        <div>
          <Smartphone className="mx-auto size-7 text-[#aaa7b6]" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-[#34353c]">未选择设备</h2>
          <p className="mt-1 text-xs leading-5 text-[#858790]">从左侧设备列表选择一个配置。</p>
        </div>
      </aside>
    );
  }

  const mutateViewport = (update: (current: DeviceViewportConfig) => DeviceViewportConfig) => {
    const state = useDeviceStore.getState();
    const currentDevice = state.devices.find((item) => item.id === device.id);
    if (!currentDevice || currentDevice.isSystem) return;

    const currentViewport = getDeviceViewport(currentDevice, orientation);
    state.updateDevice({
      ...currentDevice,
      [orientation]: update(currentViewport),
    });
  };

  const addCamera = (template: CameraTemplateId) => {
    const camera = createCameraFromTemplate(template);
    mutateViewport((current) => ({
      ...current,
      cameras: [...current.cameras, camera],
    }));
    setSelection({ type: 'camera', id: camera.id });
  };

  const deleteCamera = (id: string) => {
    mutateViewport((current) => ({
      ...current,
      cameras: current.cameras.filter((camera) => camera.id !== id),
    }));
    if (selection?.type === 'camera' && selection.id === id) {
      setSelection(null);
    }
  };

  const addHomeIndicator = () => {
    const feature = createHomeIndicator(viewport.width, viewport.height);
    mutateViewport((current) => ({
      ...current,
      displayFeatures: [...current.displayFeatures, feature],
    }));
    setSelection({ type: 'display-feature', id: feature.id });
  };

  const deleteFeature = (id: string) => {
    mutateViewport((current) => ({
      ...current,
      displayFeatures: current.displayFeatures.filter((feature) => feature.id !== id),
    }));
    if (selection?.type === 'display-feature' && selection.id === id) {
      setSelection(null);
    }
  };

  const frameInsets = getDeviceFrameInsets(device, orientation);
  const readOnly = device.isSystem;

  return (
    <aside
      id="device-property-panel"
      className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#e7e7ec] bg-white"
      aria-label="设备属性面板"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="px-4 pt-5 pb-4" aria-labelledby="device-info-heading">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="device-info-heading"
                  className="truncate text-base font-semibold text-[#202127]"
                >
                  设备信息
                </h2>
                {readOnly ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f0f0f4] px-2 py-1 text-[10px] font-medium text-[#6f717a]">
                    <LockKeyhole className="size-3" aria-hidden="true" /> 系统预设
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-[#eeeaff] px-2 py-1 text-[10px] font-medium text-[#6045df]">
                    自定义
                  </span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-[#777984]">{device.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="grid size-9 place-items-center rounded-xl bg-[#f0edff] text-[#6547f5]">
                <Smartphone className="size-[18px]" aria-hidden="true" />
              </span>
              <IconButton
                label="收起设备信息"
                size="sm"
                aria-controls="device-property-panel"
                aria-expanded="true"
                className="max-[1160px]:hidden"
                onClick={onCollapse}
              >
                <PanelRightClose className="size-4" />
              </IconButton>
            </div>
          </div>

          <dl className="rounded-xl border border-[#e7e7ec] bg-[#fafafd] px-3 py-2">
            <InfoRow label="设备名称">{device.name}</InfoRow>
            <InfoRow label="品牌 / 型号">
              {[device.brand, device.model].filter(Boolean).join(' / ') || '—'}
            </InfoRow>
            <InfoRow label="分类">{CATEGORY_LABELS[device.category]}</InfoRow>
            <InfoRow label="数据可信度">
              <DeviceConfidenceBadge confidence={device.confidence} />
            </InfoRow>
            <InfoRow label="CSS 视口">
              {viewport.width} × {viewport.height} px
            </InfoRow>
            <InfoRow label="像素比（元数据）">{device.devicePixelRatio}</InfoRow>
            <InfoRow label="当前方向">
              <span className="inline-flex items-center justify-end gap-1.5">
                <RotateCw className="size-3.5 text-[#777984]" aria-hidden="true" />
                {orientation === 'portrait' ? '竖屏' : '横屏'}
              </span>
            </InfoRow>
            <InfoRow label="屏幕圆角">{viewport.screenBorderRadius}px</InfoRow>
          </dl>
          <p className="mt-2 text-[11px] leading-4 text-[#858790]">
            DPR 和 UA 仅为配置元数据，不会改变 iframe 的真实环境或网络请求。
          </p>

          <div className="mt-3 rounded-xl border border-[#e7e7ec] px-3 py-2">
            <h3 className="mb-1 text-xs font-semibold text-[#3b3c43]">设备边框</h3>
            <dl>
              <InfoRow label="外壳">{device.frame.enabled ? '显示' : '关闭'}</InfoRow>
              <InfoRow label="边距">
                {frameInsets.top} / {frameInsets.right} / {frameInsets.bottom} / {frameInsets.left}
                px
              </InfoRow>
              <InfoRow label="圆角 / 边框">
                {device.frame.borderRadius}px / {device.frame.borderWidth}px
              </InfoRow>
              <InfoRow label="阴影">{device.frame.shadowEnabled ? '启用' : '关闭'}</InfoRow>
            </dl>
          </div>

          {readOnly ? (
            <div className="mt-3 flex gap-2 rounded-xl border border-[#e6e3f2] bg-[#faf9ff] p-3 text-xs leading-5 text-[#66616f]">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-[#725be2]" aria-hidden="true" />
              系统预设字段只读。复制为自定义设备后即可调整安全区、摄像头和其他特征。
            </div>
          ) : null}
        </section>

        <SafeAreaEditor
          value={viewport.safeArea}
          readOnly={readOnly}
          onChange={(safeArea) => mutateViewport((current) => ({ ...current, safeArea }))}
          onReset={() => {
            const baseline = safeAreaBaseline.current;
            if (!baseline || baseline.key !== baselineKey) return;
            mutateViewport((current) => ({
              ...current,
              safeArea: cloneSafeArea(baseline.value),
            }));
          }}
        />

        <CameraListEditor
          cameras={viewport.cameras}
          viewport={viewport}
          selectedCameraId={selection?.type === 'camera' ? selection.id : null}
          readOnly={readOnly}
          onSelectCamera={(id) => setSelection(id ? { type: 'camera', id } : null)}
          onAddTemplate={addCamera}
          onChangeCamera={(camera) =>
            mutateViewport((current) => ({
              ...current,
              cameras: current.cameras.map((item) => (item.id === camera.id ? camera : item)),
            }))
          }
          onDeleteCamera={deleteCamera}
        />

        <DisplayFeatureEditor
          features={viewport.displayFeatures}
          selectedFeatureId={selection?.type === 'display-feature' ? selection.id : null}
          readOnly={readOnly}
          onSelectFeature={(id) => setSelection(id ? { type: 'display-feature', id } : null)}
          onAddHomeIndicator={addHomeIndicator}
          onChangeFeature={(feature) =>
            mutateViewport((current) => ({
              ...current,
              displayFeatures: current.displayFeatures.map((item) =>
                item.id === feature.id ? feature : item,
              ),
            }))
          }
          onDeleteFeature={deleteFeature}
        />
      </div>

      <div className="shrink-0 border-t border-[#e7e7ec] bg-[#fafafd] p-3">
        {readOnly ? (
          <Button fullWidth variant="primary" onClick={() => onDuplicate(device)}>
            <Copy className="size-4" aria-hidden="true" /> 复制并编辑
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button fullWidth variant="primary" onClick={() => onEdit(device)}>
              <Pencil className="size-4" aria-hidden="true" /> 编辑完整配置
            </Button>
            <IconButton
              label={`复制 ${device.name}`}
              className="!border-[#dedee5] !bg-white shadow-sm"
              onClick={() => onDuplicate(device)}
            >
              <Copy className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}
      </div>
    </aside>
  );
}
