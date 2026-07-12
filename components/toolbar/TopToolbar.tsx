import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ChevronDown,
  Grid3X3,
  LoaderCircle,
  Maximize2,
  Minus,
  MonitorSmartphone,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Ruler,
  Settings,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Brand } from '../layout/Brand';
import { IconButton } from '../common/IconButton';
import { useDeviceStore } from '../../stores/device-store';
import { useHistoryStore } from '../../stores/history-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import { toggleWorkspacePanel } from '../../services/panel-layout-service';
import type { SimulatorScaleSetting } from '../../types/simulator';
import { tryNormalizeUrl } from '../../utils/url';
import { useToast } from '../common/ToastProvider';

const SCALE_STEPS: readonly Exclude<SimulatorScaleSetting, 'auto'>[] = [
  0.25, 0.5, 0.75, 1, 1.25, 1.5,
];

interface TopToolbarProps {
  onScreenshot: () => void;
  onCompare: () => void;
  onSettings: () => void;
  onClose?: (() => void) | undefined;
}

export function TopToolbar({ onScreenshot, onCompare, onSettings, onClose }: TopToolbarProps) {
  const devices = useDeviceStore((state) => state.devices);
  const currentDeviceId = useDeviceStore((state) => state.currentDeviceId);
  const setCurrentDevice = useDeviceStore((state) => state.setCurrentDevice);
  const recordDevice = useHistoryStore((state) => state.recordDevice);
  const recordUrl = useHistoryStore((state) => state.recordUrl);
  const recordCombination = useHistoryStore((state) => state.recordCombination);
  const simulator = useSimulatorStore();
  const { showToast } = useToast();
  const [urlError, setUrlError] = useState('');

  const canGoBack = simulator.navigationIndex > 0;
  const canGoForward = simulator.navigationIndex < simulator.navigationStack.length - 1;
  const scaleIndex = simulator.scale === 'auto' ? -1 : SCALE_STEPS.indexOf(simulator.scale);
  const displayScale = simulator.scale === 'auto' ? simulator.resolvedScale : simulator.scale;

  const deviceOptions = useMemo(
    () => devices.map((device) => ({ id: device.id, name: device.name })),
    [devices],
  );

  const handleLoad = (event: FormEvent) => {
    event.preventDefault();
    const result = tryNormalizeUrl(simulator.urlInput);
    if (!result.success) {
      setUrlError(result.error);
      return;
    }
    setUrlError('');
    simulator.navigate(result.url);
    recordUrl(result.url);
    recordCombination(result.url, currentDeviceId);
  };

  const stepScale = (direction: -1 | 1) => {
    const currentIndex = scaleIndex < 0 ? 2 : scaleIndex;
    const next =
      SCALE_STEPS[Math.max(0, Math.min(SCALE_STEPS.length - 1, currentIndex + direction))];
    if (next) simulator.setScale(next);
  };

  return (
    <header className="relative z-40 flex h-16 min-w-0 items-center gap-2 border-b border-[#e7e7ec] bg-white px-4 shadow-[0_1px_0_rgba(30,30,40,.02)]">
      <div className="w-[184px] shrink-0 max-[1200px]:hidden">
        <Brand />
      </div>
      <div className="hidden w-10 shrink-0 max-[1200px]:block">
        <Brand compact />
      </div>
      <span className="rounded-full bg-[#f1f1f4] px-2 py-1 text-[11px] font-medium text-[#5f616a] max-[1200px]:hidden">
        v1.0.0
      </span>
      <div className="mx-1 h-6 w-px shrink-0 bg-[#ececf0] max-[1200px]:hidden" />

      <div className="relative w-[190px] shrink-0 max-[1280px]:w-[156px]">
        <Smartphone className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#4f5159]" />
        <select
          aria-label="当前设备"
          value={currentDeviceId}
          onChange={(event) => {
            setCurrentDevice(event.target.value);
            recordDevice(event.target.value);
          }}
          className="h-10 w-full appearance-none rounded-lg border border-[#dedee5] bg-white pr-8 pl-9 text-sm font-medium text-[#292a31] shadow-sm outline-none focus:border-[#8f7af7] focus:ring-2 focus:ring-[#ece8ff]"
        >
          {deviceOptions.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[#6e7078]" />
      </div>

      <form
        className="relative flex min-w-[180px] flex-1 items-center max-[1100px]:min-w-[150px]"
        onSubmit={handleLoad}
      >
        <input
          aria-label="预览 URL"
          value={simulator.urlInput}
          onChange={(event) => {
            simulator.setUrlInput(event.target.value);
            if (urlError) setUrlError('');
          }}
          placeholder="输入 URL，例如 localhost:3000"
          className={`h-10 w-full rounded-lg border bg-[#fafafd] px-3 pr-[76px] text-sm text-[#303139] outline-none transition focus:bg-white focus:ring-2 ${
            urlError
              ? 'border-[#e25b5b] focus:ring-[#ffe8e8]'
              : 'border-[#dedee5] focus:border-[#8f7af7] focus:ring-[#ece8ff]'
          }`}
          title={urlError || simulator.url}
        />
        {simulator.iframeStatus === 'loading' ? (
          <LoaderCircle className="ds-spinner absolute right-[55px] size-4 text-[#6850e8]" />
        ) : null}
        <button
          type="submit"
          aria-label="加载 URL"
          className="absolute right-1.5 h-7 rounded-md bg-[#6547f5] px-2.5 text-xs font-medium text-white hover:bg-[#5636ed]"
        >
          加载
        </button>
        {urlError ? (
          <span className="absolute top-[43px] left-1 z-50 rounded-md bg-[#b83232] px-2 py-1 text-[11px] text-white shadow-lg">
            {urlError}
          </span>
        ) : null}
      </form>

      <div className="flex shrink-0 items-center max-[1100px]:hidden">
        <IconButton label="后退" disabled={!canGoBack} onClick={simulator.goBack}>
          <ArrowLeft className="size-[17px]" />
        </IconButton>
        <IconButton label="前进" disabled={!canGoForward} onClick={simulator.goForward}>
          <ArrowRight className="size-[17px]" />
        </IconButton>
        <IconButton label="刷新预览" onClick={simulator.reload}>
          <RefreshCw className="size-[17px]" />
        </IconButton>
      </div>

      <div className="flex h-10 shrink-0 items-center rounded-lg border border-[#e2e2e8] bg-[#fafafd] p-0.5">
        <IconButton
          label="竖屏"
          size="sm"
          active={simulator.orientation === 'portrait'}
          onClick={() => simulator.setOrientation('portrait')}
        >
          <Smartphone className="size-[17px]" />
        </IconButton>
        <IconButton
          label="横屏"
          size="sm"
          active={simulator.orientation === 'landscape'}
          onClick={() => simulator.setOrientation('landscape')}
        >
          <MonitorSmartphone className="size-[18px]" />
        </IconButton>
      </div>

      <div className="flex h-10 w-[124px] shrink-0 items-center justify-between rounded-lg border border-[#e2e2e8] bg-white px-0.5">
        <IconButton
          label="缩小"
          size="sm"
          disabled={scaleIndex === 0}
          onClick={() => stepScale(-1)}
        >
          <Minus className="size-4" />
        </IconButton>
        <button
          type="button"
          className="min-w-11 text-center text-sm font-semibold text-[#2a2b31]"
          title={simulator.scale === 'auto' ? '自动适应画布' : '固定缩放比例'}
          onClick={() => simulator.setScale(simulator.scale === 'auto' ? 0.75 : 'auto')}
        >
          {Math.round(displayScale * 100)}%
        </button>
        <IconButton
          label="放大"
          size="sm"
          disabled={scaleIndex === SCALE_STEPS.length - 1}
          onClick={() => stepScale(1)}
        >
          <Plus className="size-4" />
        </IconButton>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton
          label="安全区"
          active={simulator.showSafeArea}
          onClick={() => simulator.setShowSafeArea(!simulator.showSafeArea)}
        >
          <ShieldCheck className="size-[18px]" />
        </IconButton>
        <IconButton
          label="标尺"
          active={simulator.showRulers}
          onClick={() => simulator.setShowRulers(!simulator.showRulers)}
        >
          <Ruler className="size-[18px]" />
        </IconButton>
        <IconButton
          label="网格"
          active={simulator.showGrid}
          onClick={() => simulator.setShowGrid(!simulator.showGrid)}
        >
          <Grid3X3 className="size-[18px]" />
        </IconButton>
        <IconButton label="截图（实验性）" className="max-[900px]:hidden" onClick={onScreenshot}>
          <Camera className="size-[18px]" />
        </IconButton>
        <IconButton label="对比模式" className="max-[1100px]:hidden" onClick={onCompare}>
          <Maximize2 className="size-[18px]" />
        </IconButton>
        <IconButton label="设置" className="max-[1100px]:hidden" onClick={onSettings}>
          <Settings className="size-[18px]" />
        </IconButton>
      </div>

      <div className="hidden shrink-0 items-center min-[1500px]:flex">
        <IconButton
          label={simulator.leftPanelCollapsed ? '展开设备列表' : '收起设备列表'}
          aria-controls="device-list-panel"
          aria-expanded={!simulator.leftPanelCollapsed}
          onClick={() => toggleWorkspacePanel('left')}
        >
          {simulator.leftPanelCollapsed ? (
            <PanelLeftOpen className="size-[18px]" />
          ) : (
            <PanelLeftClose className="size-[18px]" />
          )}
        </IconButton>
        <IconButton
          label={simulator.rightPanelCollapsed ? '展开设备信息' : '收起设备信息'}
          aria-controls="device-property-panel"
          aria-expanded={!simulator.rightPanelCollapsed}
          onClick={() => toggleWorkspacePanel('right')}
        >
          {simulator.rightPanelCollapsed ? (
            <PanelRightOpen className="size-[18px]" />
          ) : (
            <PanelRightClose className="size-[18px]" />
          )}
        </IconButton>
      </div>

      {onClose ? (
        <IconButton label="退出页面内模拟器" onClick={onClose}>
          <X className="size-[19px]" />
        </IconButton>
      ) : null}

      <button
        type="button"
        className="sr-only"
        onClick={() => showToast('工具栏所有状态均已就绪', 'info')}
      >
        工具栏状态
      </button>
    </header>
  );
}
