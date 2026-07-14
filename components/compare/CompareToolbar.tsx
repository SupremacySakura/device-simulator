import {
  Columns2,
  Grid3X3,
  LayoutGrid,
  Maximize,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCw,
  RotateCw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import type { CompareLayoutMode } from '../../types/compare';
import { Brand } from '../layout/Brand';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';

interface CompareToolbarProps {
  globalUrlInput: string;
  urlError: string;
  canvasScale: number;
  syncScrollEnabled: boolean;
  syncNavigationEnabled: boolean;
  syncRefreshEnabled: boolean;
  syncOrientationEnabled: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onGlobalUrlInputChange: (value: string) => void;
  onLoadAll: () => void;
  onOpenAddDialog: () => void;
  onRefreshAll: () => void;
  onRotateAll: (mode?: 'toggle' | 'portrait' | 'landscape') => void;
  onToggleSyncScroll: () => void;
  onToggleSyncNavigation: () => void;
  onToggleSyncRefresh: () => void;
  onToggleSyncOrientation: () => void;
  onAutoLayout: (mode: Exclude<CompareLayoutMode, 'free'>) => void;
  onZoom: (direction: -1 | 1) => void;
  onFit: () => void;
  onResetView: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onClear: () => void;
  onSwitchSingle: () => void;
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
}

function SyncButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`h-8 shrink-0 rounded-lg border px-2.5 text-[11px] font-medium transition ${
        active
          ? 'border-[#d7cfff] bg-[#f0edff] text-[#5d3df0]'
          : 'border-[#e2e2e8] bg-white text-[#62646d] hover:bg-[#f7f7f9]'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function CompareToolbar({
  globalUrlInput,
  urlError,
  canvasScale,
  syncScrollEnabled,
  syncNavigationEnabled,
  syncRefreshEnabled,
  syncOrientationEnabled,
  showGrid,
  snapToGrid,
  leftPanelCollapsed,
  rightPanelCollapsed,
  onGlobalUrlInputChange,
  onLoadAll,
  onOpenAddDialog,
  onRefreshAll,
  onRotateAll,
  onToggleSyncScroll,
  onToggleSyncNavigation,
  onToggleSyncRefresh,
  onToggleSyncOrientation,
  onAutoLayout,
  onZoom,
  onFit,
  onResetView,
  onToggleGrid,
  onToggleSnap,
  onClear,
  onSwitchSingle,
  onToggleLeftPanel,
  onToggleRightPanel,
}: CompareToolbarProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onLoadAll();
  };

  return (
    <header className="relative z-50 flex h-16 min-w-0 items-center gap-2 border-b border-[#e7e7ec] bg-white px-3 shadow-[0_1px_0_rgba(30,30,40,.02)]">
      <div className="hidden w-[164px] shrink-0 min-[1320px]:block">
        <Brand />
      </div>
      <div className="w-10 shrink-0 min-[1320px]:hidden">
        <Brand compact />
      </div>

      <div className="flex h-9 shrink-0 items-center rounded-lg border border-[#e1e1e7] bg-[#fafafd] p-0.5">
        <button
          type="button"
          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs text-[#696b74] hover:bg-white"
          onClick={onSwitchSingle}
        >
          <Smartphone className="size-3.5" /> 单设备
        </button>
        <span className="flex h-8 items-center gap-1.5 rounded-md bg-[#6547f5] px-2.5 text-xs font-semibold text-white shadow-sm">
          <Columns2 className="size-3.5" /> 多设备对比
        </span>
      </div>

      <form
        className="relative flex min-w-[220px] max-w-[520px] flex-1 items-center"
        onSubmit={submit}
      >
        <input
          aria-label="对比模式全局 URL"
          value={globalUrlInput}
          placeholder="全局 URL，例如 localhost:3000"
          className={`h-9 w-full rounded-lg border bg-[#fafafd] pr-[72px] pl-3 text-xs outline-none focus:bg-white focus:ring-2 ${
            urlError
              ? 'border-[#e25b5b] focus:ring-[#ffe8e8]'
              : 'border-[#dedee5] focus:border-[#8f7af7] focus:ring-[#ece8ff]'
          }`}
          title={urlError || globalUrlInput}
          onChange={(event) => onGlobalUrlInputChange(event.target.value)}
        />
        <button
          type="submit"
          className="absolute right-1 h-7 rounded-md bg-[#6547f5] px-2.5 text-[11px] font-medium text-white hover:bg-[#5636ed]"
        >
          加载全部
        </button>
        {urlError ? (
          <span className="absolute top-[40px] left-1 z-[70] rounded-md bg-[#b83232] px-2 py-1 text-[11px] text-white shadow-lg">
            {urlError}
          </span>
        ) : null}
      </form>

      <div className="flex min-w-0 shrink items-center gap-1 overflow-x-auto py-1">
        <Button className="!h-8 shrink-0 !px-2.5 !text-xs" onClick={onOpenAddDialog}>
          <Plus className="size-3.5" /> 添加设备
        </Button>
        <IconButton label="刷新全部设备" size="sm" onClick={onRefreshAll}>
          <RefreshCw className="size-4" />
        </IconButton>
        <IconButton label="切换全部设备方向" size="sm" onClick={() => onRotateAll('toggle')}>
          <RotateCw className="size-4" />
        </IconButton>
        <select
          aria-label="统一设置全部设备方向"
          defaultValue=""
          className="h-8 w-[76px] shrink-0 rounded-lg border border-[#e2e2e8] bg-white px-1.5 text-[11px] text-[#555760]"
          onChange={(event) => {
            const mode = event.target.value;
            if (mode === 'portrait' || mode === 'landscape') onRotateAll(mode);
            event.target.value = '';
          }}
        >
          <option value="" disabled>
            统一方向
          </option>
          <option value="portrait">全部竖屏</option>
          <option value="landscape">全部横屏</option>
        </select>
        <SyncButton label="同步滚动" active={syncScrollEnabled} onClick={onToggleSyncScroll} />
        <SyncButton
          label="同步导航"
          active={syncNavigationEnabled}
          onClick={onToggleSyncNavigation}
        />
        <SyncButton label="同步刷新" active={syncRefreshEnabled} onClick={onToggleSyncRefresh} />
        <SyncButton
          label="同步方向"
          active={syncOrientationEnabled}
          onClick={onToggleSyncOrientation}
        />
        <select
          aria-label="自动排列设备"
          defaultValue=""
          className="h-8 shrink-0 rounded-lg border border-[#e2e2e8] bg-white px-2 text-[11px] text-[#555760]"
          onChange={(event) => {
            const mode = event.target.value;
            if (mode === 'horizontal' || mode === 'vertical' || mode === 'grid') {
              onAutoLayout(mode);
            }
            event.target.value = '';
          }}
        >
          <option value="" disabled>
            自动排列
          </option>
          <option value="horizontal">横向排列</option>
          <option value="vertical">纵向排列</option>
          <option value="grid">网格排列</option>
        </select>
        <div className="flex h-8 shrink-0 items-center rounded-lg border border-[#e2e2e8] bg-white">
          <IconButton
            label="缩小画布"
            size="sm"
            disabled={canvasScale <= 0.2}
            onClick={() => onZoom(-1)}
          >
            <Minus className="size-3.5" />
          </IconButton>
          <span className="w-11 text-center text-[11px] font-semibold text-[#3f4047]">
            {Math.round(canvasScale * 100)}%
          </span>
          <IconButton
            label="放大画布"
            size="sm"
            disabled={canvasScale >= 2}
            onClick={() => onZoom(1)}
          >
            <Plus className="size-3.5" />
          </IconButton>
        </div>
        <IconButton label="适应全部设备" size="sm" onClick={onFit}>
          <Maximize className="size-4" />
        </IconButton>
        <IconButton label="重置画布视图" size="sm" onClick={onResetView}>
          <LayoutGrid className="size-4" />
        </IconButton>
        <IconButton label="显示网格" size="sm" active={showGrid} onClick={onToggleGrid}>
          <Grid3X3 className="size-4" />
        </IconButton>
        <SyncButton label="吸附" active={snapToGrid} onClick={onToggleSnap} />
        <IconButton label="清空对比画布" size="sm" onClick={onClear}>
          <Trash2 className="size-4 text-[#bf3f3f]" />
        </IconButton>
        <IconButton
          label={leftPanelCollapsed ? '展开设备库' : '收起设备库'}
          size="sm"
          onClick={onToggleLeftPanel}
        >
          {leftPanelCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </IconButton>
        <IconButton
          label={rightPanelCollapsed ? '展开属性面板' : '收起属性面板'}
          size="sm"
          onClick={onToggleRightPanel}
        >
          {rightPanelCollapsed ? (
            <PanelRightOpen className="size-4" />
          ) : (
            <PanelRightClose className="size-4" />
          )}
        </IconButton>
      </div>
    </header>
  );
}
