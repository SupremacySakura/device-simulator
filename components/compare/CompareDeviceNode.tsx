import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  RefreshCw,
  Replace,
  RotateCw,
  Trash2,
  Unplug,
} from 'lucide-react';
import { memo, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type {
  CompareDeviceInstance,
  CompareInstanceRuntime,
  CanvasPosition,
} from '../../types/compare';
import type { DeviceProfile } from '../../types/device';
import type { IframeStatus } from '../../types/simulator';
import { getDeviceViewport } from '../../utils/device-profile';
import { getInstanceVisualSizeOrFallback } from '../../utils/instance-size';
import { isControlledComparePageUrl } from '../../utils/compare-message';
import { DevicePreview } from '../simulator/DevicePreview';

interface CompareDeviceNodeProps {
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
  iframeName?: string;
  iframeRef?: (element: HTMLIFrameElement | null) => void;
  onSelect: (instanceId: string, additive: boolean) => void;
  onDragStart: (event: ReactPointerEvent<HTMLElement>, instanceId: string) => void;
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

function statusLabel(status: IframeStatus): string {
  switch (status) {
    case 'loading':
      return '加载中';
    case 'loaded':
      return '加载完成';
    case 'error':
      return '加载失败';
    case 'blocked':
      return '可能被拦截';
    default:
      return '等待加载';
  }
}

function CompareDeviceNodeComponent({
  instance,
  profile,
  runtime,
  position,
  selected,
  active,
  dragging,
  globalUrl,
  syncScrollEnabled,
  syncNavigationEnabled,
  iframeName,
  iframeRef,
  onSelect,
  onDragStart,
  onStatusChange,
  onRefresh,
  onRotate,
  onDuplicate,
  onResetScale,
  onDelete,
  onOpenSingle,
  onReplace,
  onContextMenu,
}: CompareDeviceNodeProps) {
  const handleStatus = useCallback(
    (status: IframeStatus, message?: string) => onStatusChange(instance.id, status, message),
    [instance.id, onStatusChange],
  );
  const handleReload = useCallback(() => onRefresh(instance.id), [instance.id, onRefresh]);
  const size = getInstanceVisualSizeOrFallback(instance, profile);
  const viewport = profile ? getDeviceViewport(profile, instance.orientation) : null;
  const title = instance.name?.trim() || profile?.name || '失效设备';
  const unavailableMessages: string[] = [];
  const crossOriginUnsupported =
    runtime.scrollSyncSupported === false &&
    runtime.navigationSyncSupported === false &&
    /^https?:\/\//i.test(instance.url) &&
    !isControlledComparePageUrl(instance.url);
  if (crossOriginUnsupported) unavailableMessages.push('跨域页面无法注入脚本');
  if (syncScrollEnabled && runtime.scrollSyncSupported === false)
    unavailableMessages.push('滚动同步不可用');
  if (syncNavigationEnabled && runtime.navigationSyncSupported === false)
    unavailableMessages.push('导航同步不可用');
  const unavailableLabel = unavailableMessages.join(' · ');
  const deviceDetails = profile
    ? `${profile.name} · ${viewport?.width ?? 0} × ${viewport?.height ?? 0}`
    : '配置失效 · 280 × 180';

  return (
    <article
      data-compare-node="true"
      data-instance-id={instance.id}
      aria-label={`${title} 对比实例`}
      aria-selected={selected}
      className={`absolute isolate rounded-[3px] transition-[box-shadow] ${
        selected
          ? 'shadow-[0_0_0_3px_rgba(101,71,245,.9),0_12px_30px_rgba(30,30,45,.18)]'
          : 'shadow-[0_0_0_1px_rgba(70,70,80,.15)] hover:shadow-[0_0_0_2px_rgba(101,71,245,.4),0_10px_26px_rgba(30,30,45,.14)]'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        zIndex: active ? 30 : selected ? 20 : 1,
        willChange: dragging ? 'left, top' : undefined,
      }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onSelect(instance.id, event.shiftKey || event.metaKey || event.ctrlKey);
        }
      }}
      onContextMenu={(event) => onContextMenu(event, instance.id)}
    >
      <header
        data-device-drag-handle="true"
        role="button"
        tabIndex={0}
        aria-label={`选择并拖动 ${title}`}
        className={`absolute right-0 -top-12 left-0 flex h-10 cursor-grab items-center gap-2 rounded-lg border px-2 shadow-sm backdrop-blur-sm active:cursor-grabbing ${
          selected
            ? 'border-[#cfc5ff] bg-[#f5f2ff]/96'
            : 'border-[#dedee5] bg-white/96 hover:border-[#cfc5ff]'
        }`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if ((event.target as HTMLElement).closest('button, details')) return;
          const additive = event.shiftKey || event.metaKey || event.ctrlKey;
          onSelect(instance.id, additive);
          if (additive) return;
          onDragStart(event, instance.id);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelect(instance.id, event.shiftKey || event.metaKey || event.ctrlKey);
        }}
      >
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-semibold text-[#303139]">{title}</span>
          <span className="mt-0.5 block truncate text-[9px] font-normal text-[#858790]">
            {deviceDetails}
          </span>
        </span>
        <span className="shrink-0 rounded bg-[#f0f0f4] px-1.5 py-0.5 text-[9px] font-medium text-[#696b74]">
          {instance.orientation === 'portrait' ? '竖屏' : '横屏'}
        </span>
        {instance.url !== globalUrl ? (
          <span className="shrink-0 rounded bg-[#fff1d8] px-1.5 py-0.5 text-[9px] font-semibold text-[#956820]">
            独立 URL
          </span>
        ) : null}
        <span
          className={`size-2 shrink-0 rounded-full ${
            runtime.iframeStatus === 'loaded'
              ? 'bg-[#35a66b]'
              : runtime.iframeStatus === 'loading'
                ? 'bg-[#e8a93d]'
                : runtime.iframeStatus === 'error' || runtime.iframeStatus === 'blocked'
                  ? 'bg-[#d64d4d]'
                  : 'bg-[#afb1b9]'
          }`}
          title={statusLabel(runtime.iframeStatus)}
        />
        <details className="relative" onPointerDown={(event) => event.stopPropagation()}>
          <summary
            aria-label={`${title} 更多操作`}
            title="更多操作"
            className="grid size-6 cursor-pointer list-none place-items-center rounded-md text-[#666873] hover:bg-white"
          >
            <MoreHorizontal className="size-4" />
          </summary>
          <div className="absolute top-7 right-0 z-50 grid w-48 gap-0.5 rounded-xl border border-[#dedee5] bg-white p-1.5 shadow-xl">
            {[
              { label: '刷新', icon: <RefreshCw className="size-3.5" />, action: onRefresh },
              { label: '切换方向', icon: <RotateCw className="size-3.5" />, action: onRotate },
              { label: '复制实例', icon: <Copy className="size-3.5" />, action: onDuplicate },
              {
                label: '重置实例缩放',
                icon: <RotateCw className="size-3.5" />,
                action: onResetScale,
              },
              { label: '更换设备', icon: <Replace className="size-3.5" />, action: onReplace },
              {
                label: '在单设备模式打开',
                icon: <ExternalLink className="size-3.5" />,
                action: onOpenSingle,
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex h-8 items-center gap-2 rounded-lg px-2 text-left text-xs text-[#4c4e56] hover:bg-[#f3f1ff] hover:text-[#5d3df0]"
                onClick={() => item.action(instance.id)}
              >
                {item.icon} {item.label}
              </button>
            ))}
            <button
              type="button"
              className="mt-1 flex h-8 items-center gap-2 border-t border-[#ededf1] px-2 pt-1 text-left text-xs text-[#c93636] hover:bg-[#fff0f0]"
              onClick={() => onDelete(instance.id)}
            >
              <Trash2 className="size-3.5" /> 删除实例
            </button>
          </div>
        </details>
      </header>

      {profile ? (
        <DevicePreview
          profile={profile}
          orientation={instance.orientation}
          url={instance.url}
          reloadKey={runtime.reloadKey}
          observedUrl={runtime.observedUrl}
          iframeStatus={runtime.iframeStatus}
          iframeMessage={runtime.iframeMessage}
          scale={instance.scale}
          safeAreaVisible={instance.safeAreaVisible}
          cameraVisible={instance.cameraVisible}
          displayFeaturesVisible={instance.displayFeaturesVisible}
          frameVisible={instance.frameVisible}
          showShadow
          iframeTitle={`${title} 页面预览`}
          interactionBlocked={dragging}
          onStatusChange={handleStatus}
          onReload={handleReload}
          {...(iframeName === undefined ? {} : { iframeName })}
          {...(iframeRef === undefined ? {} : { iframeRef })}
        />
      ) : (
        <div className="grid size-full place-items-center rounded-xl border border-dashed border-[#e0a0a0] bg-[#fff8f8] p-6 text-center">
          <div>
            <Unplug className="mx-auto size-7 text-[#c94a4a]" />
            <h3 className="mt-3 text-sm font-semibold text-[#7f3030]">该设备配置已被删除</h3>
            <p className="mt-1 text-[11px] leading-5 text-[#a45b5b]">
              实例数据仍已保留，可以更换设备或删除实例。
            </p>
            <div className="mt-3 flex justify-center gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#6547f5] px-3 py-1.5 text-xs font-medium text-white"
                onClick={() => onReplace(instance.id)}
              >
                更换设备
              </button>
              <button
                type="button"
                className="rounded-lg border border-[#f0caca] px-3 py-1.5 text-xs font-medium text-[#b33c3c]"
                onClick={() => onDelete(instance.id)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="absolute right-0 -bottom-8 left-0 flex h-6 items-center justify-between rounded-md bg-white/90 px-2 text-[10px] text-[#686a73] shadow-sm backdrop-blur-sm">
        <span>
          {viewport ? `${viewport.width} × ${viewport.height}` : '配置失效'} ·{' '}
          {Math.round(instance.scale * 100)}%
        </span>
        <span
          className={`max-w-[55%] truncate ${unavailableLabel ? 'text-[#b87322]' : ''}`}
          title={unavailableLabel || statusLabel(runtime.iframeStatus)}
        >
          {unavailableLabel || statusLabel(runtime.iframeStatus)}
        </span>
      </footer>
    </article>
  );
}

export const CompareDeviceNode = memo(CompareDeviceNodeComponent);
