import { Grid3X3, MonitorCog, PanelLeftClose, PanelRightClose, Sparkles } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { DEFAULT_SETTINGS, type DeviceSimulatorSettings } from '../../constants/default-settings';
import { useDeviceStore } from '../../stores/device-store';
import { useSettingsStore } from '../../stores/settings-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type { SimulatorScaleSetting } from '../../types/simulator';
import { Button } from './Button';
import { SelectField } from './FormField';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type SettingsDraft = Omit<DeviceSimulatorSettings, 'defaultScale'> & {
  defaultScale: SimulatorScaleSetting;
};

const SCALE_OPTIONS = [
  { value: 'auto', label: '自动适应' },
  { value: '0.25', label: '25%' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
] as const;

const SUPPORTED_SCALES: ReadonlySet<number> = new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5]);

function normalizeScale(value: number | 'auto'): SimulatorScaleSetting {
  if (value === 'auto') return 'auto';
  return SUPPORTED_SCALES.has(value) ? value : 'auto';
}

function createDraft(settings: DeviceSimulatorSettings): SettingsDraft {
  return {
    ...settings,
    defaultScale: normalizeScale(settings.defaultScale),
    layout: { ...settings.layout },
  };
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#e4e4ea] bg-white px-3.5 py-3 transition hover:border-[#d5d0f1] hover:bg-[#fbfaff]">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f1efff] text-[#6547f5]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#303138]">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-[#777983]">{description}</span>
      </span>
      <span className="relative shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="block h-5 w-9 rounded-full bg-[#c9cad1] transition peer-checked:bg-[#6547f5] peer-focus-visible:ring-2 peer-focus-visible:ring-[#9c8cf8] peer-focus-visible:ring-offset-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4" />
      </span>
    </label>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3">
      <div>
        <h3 className="m-0 text-sm font-semibold text-[#2b2c32]">{title}</h3>
        <p className="mt-1 mb-0 text-xs leading-5 text-[#777983]">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const devices = useDeviceStore((state) => state.devices);
  const currentDeviceId = useDeviceStore((state) => state.currentDeviceId);
  const setCurrentDevice = useDeviceStore((state) => state.setCurrentDevice);
  const defaultDeviceId = useSettingsStore((state) => state.defaultDeviceId);
  const defaultScale = useSettingsStore((state) => state.defaultScale);
  const showShadow = useSettingsStore((state) => state.showShadow);
  const showGrid = useSettingsStore((state) => state.showGrid);
  const autoOpenCurrentPage = useSettingsStore((state) => state.autoOpenCurrentPage);
  const layout = useSettingsStore((state) => state.layout);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const setScale = useSimulatorStore((state) => state.setScale);
  const setShowShadow = useSimulatorStore((state) => state.setShowShadow);
  const setShowGrid = useSimulatorStore((state) => state.setShowGrid);
  const setLeftPanelCollapsed = useSimulatorStore((state) => state.setLeftPanelCollapsed);
  const setRightPanelCollapsed = useSimulatorStore((state) => state.setRightPanelCollapsed);
  const { showToast } = useToast();
  const [draft, setDraft] = useState<SettingsDraft>(() => createDraft(DEFAULT_SETTINGS));

  useEffect(() => {
    if (!open) return;
    const availableDefault = devices.some((device) => device.id === defaultDeviceId)
      ? defaultDeviceId
      : currentDeviceId || devices[0]?.id || '';
    setDraft(
      createDraft({
        defaultDeviceId: availableDefault,
        defaultScale,
        showShadow,
        showGrid,
        autoOpenCurrentPage,
        layout: { ...layout },
      }),
    );
  }, [
    autoOpenCurrentPage,
    currentDeviceId,
    defaultDeviceId,
    defaultScale,
    devices,
    layout,
    open,
    showGrid,
    showShadow,
  ]);

  function updateDraft<K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateLayout(
    key: keyof SettingsDraft['layout'],
    value: SettingsDraft['layout'][typeof key],
  ): void {
    setDraft((current) => ({
      ...current,
      layout: { ...current.layout, [key]: value },
    }));
  }

  function handleScaleChange(value: string): void {
    if (value === 'auto') {
      updateDraft('defaultScale', 'auto');
      return;
    }
    const numeric = Number(value);
    updateDraft('defaultScale', normalizeScale(numeric));
  }

  function handleSave(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!devices.some((device) => device.id === draft.defaultDeviceId)) {
      showToast('默认设备已不存在，请重新选择。', 'error');
      return;
    }

    updateSettings({
      ...draft,
      layout: { ...draft.layout },
    });
    setCurrentDevice(draft.defaultDeviceId);
    setScale(draft.defaultScale);
    setShowShadow(draft.showShadow);
    setShowGrid(draft.showGrid);
    setLeftPanelCollapsed(draft.layout.leftPanelCollapsed);
    setRightPanelCollapsed(draft.layout.rightPanelCollapsed);
    showToast('设置已保存并应用。');
    onClose();
  }

  return (
    <Modal
      open={open}
      title="设置"
      description="管理启动偏好、画布显示与工作台布局。"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" type="submit" form="device-simulator-settings-form">
            保存并应用
          </Button>
        </>
      }
    >
      <form id="device-simulator-settings-form" className="grid gap-6" onSubmit={handleSave}>
        <SettingsSection title="启动偏好" description="设置新工作台默认使用的设备和缩放比例。">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="默认设备"
              value={draft.defaultDeviceId}
              onChange={(event) => updateDraft('defaultDeviceId', event.currentTarget.value)}
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              label="默认缩放"
              value={String(draft.defaultScale)}
              onChange={(event) => handleScaleChange(event.currentTarget.value)}
            >
              {SCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>
          <ToggleRow
            icon={<Sparkles aria-hidden="true" className="size-4" />}
            title="自动打开当前页面"
            description="从 Popup 进入工作台时，优先带入当前可模拟的网页。"
            checked={draft.autoOpenCurrentPage}
            onChange={(value) => updateDraft('autoOpenCurrentPage', value)}
          />
        </SettingsSection>

        <div className="h-px bg-[#ececf0]" />

        <SettingsSection title="画布显示" description="这些选项会立即应用到当前模拟器。">
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow
              icon={<MonitorCog aria-hidden="true" className="size-4" />}
              title="设备阴影"
              description="显示设备外壳投影"
              checked={draft.showShadow}
              onChange={(value) => updateDraft('showShadow', value)}
            />
            <ToggleRow
              icon={<Grid3X3 aria-hidden="true" className="size-4" />}
              title="画布网格"
              description="显示 CSS 像素参考网格"
              checked={draft.showGrid}
              onChange={(value) => updateDraft('showGrid', value)}
            />
          </div>
        </SettingsSection>

        <div className="h-px bg-[#ececf0]" />

        <SettingsSection title="工作台布局" description="保存左右面板在下次打开时的折叠状态。">
          <div className="grid grid-cols-2 gap-3">
            <ToggleRow
              icon={<PanelLeftClose aria-hidden="true" className="size-4" />}
              title="折叠设备面板"
              description="隐藏左侧设备列表"
              checked={draft.layout.leftPanelCollapsed}
              onChange={(value) => updateLayout('leftPanelCollapsed', value)}
            />
            <ToggleRow
              icon={<PanelRightClose aria-hidden="true" className="size-4" />}
              title="折叠属性面板"
              description="隐藏右侧设备属性"
              checked={draft.layout.rightPanelCollapsed}
              onChange={(value) => updateLayout('rightPanelCollapsed', value)}
            />
          </div>
        </SettingsSection>
      </form>
    </Modal>
  );
}
