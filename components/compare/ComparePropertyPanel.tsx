import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Copy,
  ExternalLink,
  Grid3X3,
  PanelRightClose,
  RotateCw,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import type {
  AlignmentAction,
  CompareAutoLayoutMode,
  CompareDeviceInstance,
  CompareInstancePatch,
} from '../../types/compare';
import type { DeviceProfile } from '../../types/device';
import { getDeviceViewport } from '../../utils/device-profile';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';

interface ComparePropertyPanelProps {
  selectedInstances: readonly CompareDeviceInstance[];
  devices: readonly DeviceProfile[];
  globalUrl: string;
  canvasScale: number;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  syncScrollEnabled: boolean;
  syncNavigationEnabled: boolean;
  syncRefreshEnabled: boolean;
  syncOrientationEnabled: boolean;
  onUpdateInstance: (instanceId: string, patch: CompareInstancePatch) => void;
  onUpdateSelected: (patch: CompareInstancePatch) => void;
  onRotateSelected: () => void;
  onLoadInstanceUrl: (instanceId: string, value: string) => boolean;
  onLoadSelectedUrl: (value: string) => boolean;
  onDuplicate: (instanceId: string) => void;
  onDelete: (instanceId: string) => void;
  onDeleteSelected: () => void;
  onOpenSingle: (instanceId: string) => void;
  onAlign: (action: AlignmentAction) => void;
  onAutoLayout: (mode: CompareAutoLayoutMode) => void;
  onCanvasScale: (value: number) => void;
  onGridSize: (value: number) => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onToggleSync: (
    key:
      | 'syncScrollEnabled'
      | 'syncNavigationEnabled'
      | 'syncRefreshEnabled'
      | 'syncOrientationEnabled',
  ) => void;
  onCollapse: () => void;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-[#ececf0] px-4 py-4 last:border-b-0">
      <h3 className="mb-3 text-xs font-semibold text-[#303139]">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3 text-xs text-[#6f717a]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
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
      className="flex h-8 w-full items-center justify-between text-xs text-[#555760]"
      onClick={onClick}
    >
      {label}
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${active ? 'bg-[#6547f5]' : 'bg-[#d5d6dc]'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
        />
      </span>
    </button>
  );
}

const inputClass =
  'h-9 min-w-0 w-full rounded-lg border border-[#dedee5] bg-white px-2.5 text-xs text-[#303139] outline-none focus:border-[#8f7af7] focus:ring-2 focus:ring-[#ece8ff]';

function CanvasSettings(props: ComparePropertyPanelProps) {
  return (
    <>
      <Section title="画布设置">
        <div className="grid gap-3">
          <Field label="画布缩放">
            <div className="flex items-center gap-2">
              <input
                aria-label="画布缩放"
                type="range"
                min="0.2"
                max="2"
                step="0.05"
                value={props.canvasScale}
                className="min-w-0 flex-1 accent-[#6547f5]"
                onChange={(event) => props.onCanvasScale(Number(event.target.value))}
              />
              <span className="w-10 text-right font-semibold text-[#4d4e56]">
                {Math.round(props.canvasScale * 100)}%
              </span>
            </div>
          </Field>
          <Field label="网格尺寸">
            <input
              type="number"
              min="4"
              max="200"
              value={props.gridSize}
              className={inputClass}
              onChange={(event) => props.onGridSize(Number(event.target.value))}
            />
          </Field>
          <ToggleRow label="显示点阵网格" active={props.showGrid} onClick={props.onToggleGrid} />
          <ToggleRow
            label="移动时吸附网格"
            active={props.snapToGrid}
            onClick={props.onToggleSnap}
          />
        </div>
      </Section>
      <Section title="自动排列">
        <div className="grid grid-cols-3 gap-2">
          <Button className="!px-1 !text-xs" onClick={() => props.onAutoLayout('horizontal')}>
            横向
          </Button>
          <Button className="!px-1 !text-xs" onClick={() => props.onAutoLayout('vertical')}>
            纵向
          </Button>
          <Button className="!px-1 !text-xs" onClick={() => props.onAutoLayout('grid')}>
            <Grid3X3 className="size-3.5" /> 网格
          </Button>
        </div>
      </Section>
      <Section title="同步设置">
        <div className="grid gap-1">
          <ToggleRow
            label="同步滚动"
            active={props.syncScrollEnabled}
            onClick={() => props.onToggleSync('syncScrollEnabled')}
          />
          <ToggleRow
            label="同步导航"
            active={props.syncNavigationEnabled}
            onClick={() => props.onToggleSync('syncNavigationEnabled')}
          />
          <ToggleRow
            label="同步刷新"
            active={props.syncRefreshEnabled}
            onClick={() => props.onToggleSync('syncRefreshEnabled')}
          />
          <ToggleRow
            label="同步方向"
            active={props.syncOrientationEnabled}
            onClick={() => props.onToggleSync('syncOrientationEnabled')}
          />
        </div>
        <p className="mt-3 rounded-lg bg-[#fff8e8] p-2 text-[10px] leading-4 text-[#8a6523]">
          滚动与真实导航同步仅在内置示例或已建立扩展桥接的本地页面可用。
        </p>
      </Section>
    </>
  );
}

function SingleInstanceSettings({
  instance,
  profile,
  props,
}: {
  instance: CompareDeviceInstance;
  profile: DeviceProfile | undefined;
  props: ComparePropertyPanelProps;
}) {
  const [urlDraft, setUrlDraft] = useState(instance.url);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    setUrlDraft(instance.url);
    setUrlError('');
  }, [instance.id, instance.url]);

  const loadUrl = () => {
    if (props.onLoadInstanceUrl(instance.id, urlDraft)) setUrlError('');
    else setUrlError('URL 格式无效');
  };

  const viewport = profile ? getDeviceViewport(profile, instance.orientation) : null;
  return (
    <>
      {!profile ? (
        <div className="m-4 rounded-xl border border-[#ffd6d6] bg-[#fff5f5] p-3 text-xs text-[#a43333]">
          <strong className="block">该设备配置已被删除</strong>
          <span className="mt-1 block text-[10px] leading-4">
            更换设备后会保留当前实例的位置、URL 和显示设置。
          </span>
        </div>
      ) : null}
      <Section title="实例设置">
        <div className="grid gap-3">
          <Field label="实例名称">
            <input
              value={instance.name ?? ''}
              placeholder={profile?.name ?? '失效设备'}
              className={inputClass}
              onChange={(event) =>
                props.onUpdateInstance(instance.id, { name: event.target.value || undefined })
              }
            />
          </Field>
          <Field label="设备型号">
            <select
              value={profile ? instance.deviceId : ''}
              className={inputClass}
              onChange={(event) =>
                props.onUpdateInstance(instance.id, { deviceId: event.target.value })
              }
            >
              {!profile ? <option value="">请选择替换设备</option> : null}
              {props.devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name}
                </option>
              ))}
            </select>
          </Field>
          {viewport ? (
            <Field label="当前尺寸">
              <span className="text-right font-semibold text-[#404148]">
                {viewport.width} × {viewport.height}
              </span>
            </Field>
          ) : null}
          <Field label="方向">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#f2f2f5] p-1">
              {(['portrait', 'landscape'] as const).map((orientation) => (
                <button
                  key={orientation}
                  type="button"
                  className={`h-7 rounded-md text-[11px] font-medium ${
                    instance.orientation === orientation
                      ? 'bg-white text-[#5d3df0] shadow-sm'
                      : 'text-[#6e7078]'
                  }`}
                  onClick={() => props.onUpdateInstance(instance.id, { orientation })}
                >
                  {orientation === 'portrait' ? '竖屏' : '横屏'}
                </button>
              ))}
            </div>
          </Field>
          <Field label="实例缩放">
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.05"
                value={instance.scale}
                className="min-w-0 flex-1 accent-[#6547f5]"
                onChange={(event) =>
                  props.onUpdateInstance(instance.id, { scale: Number(event.target.value) })
                }
              />
              <span className="w-10 text-right font-semibold">
                {Math.round(instance.scale * 100)}%
              </span>
            </div>
          </Field>
          <Field label="X / Y">
            <div className="grid grid-cols-2 gap-2">
              <input
                aria-label="实例 X 坐标"
                type="number"
                value={Math.round(instance.position.x)}
                className={inputClass}
                onChange={(event) =>
                  props.onUpdateInstance(instance.id, {
                    position: { ...instance.position, x: Number(event.target.value) },
                  })
                }
              />
              <input
                aria-label="实例 Y 坐标"
                type="number"
                value={Math.round(instance.position.y)}
                className={inputClass}
                onChange={(event) =>
                  props.onUpdateInstance(instance.id, {
                    position: { ...instance.position, y: Number(event.target.value) },
                  })
                }
              />
            </div>
          </Field>
        </div>
      </Section>
      <Section title="页面地址">
        <div className="flex gap-2">
          <input
            value={urlDraft}
            placeholder="输入独立 URL"
            className={`${inputClass} ${urlError ? '!border-[#e25b5b]' : ''}`}
            onChange={(event) => {
              setUrlDraft(event.target.value);
              setUrlError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') loadUrl();
            }}
          />
          <Button className="!px-2 !text-xs" onClick={loadUrl}>
            加载
          </Button>
        </div>
        {instance.url !== props.globalUrl ? (
          <button
            type="button"
            className="mt-2 text-[11px] font-medium text-[#6045df] hover:underline"
            onClick={() => {
              setUrlDraft(props.globalUrl);
              props.onUpdateInstance(instance.id, { url: props.globalUrl });
            }}
          >
            独立 URL · 恢复为全局 URL
          </button>
        ) : null}
      </Section>
      <Section title="显示设置">
        <div className="grid gap-1">
          <ToggleRow
            label="安全区"
            active={instance.safeAreaVisible}
            onClick={() =>
              props.onUpdateInstance(instance.id, {
                safeAreaVisible: !instance.safeAreaVisible,
              })
            }
          />
          <ToggleRow
            label="摄像头 / 挖孔"
            active={instance.cameraVisible}
            onClick={() =>
              props.onUpdateInstance(instance.id, { cameraVisible: !instance.cameraVisible })
            }
          />
          <ToggleRow
            label="屏幕特征"
            active={instance.displayFeaturesVisible}
            onClick={() =>
              props.onUpdateInstance(instance.id, {
                displayFeaturesVisible: !instance.displayFeaturesVisible,
              })
            }
          />
          <ToggleRow
            label="设备边框"
            active={instance.frameVisible}
            onClick={() =>
              props.onUpdateInstance(instance.id, { frameVisible: !instance.frameVisible })
            }
          />
        </div>
      </Section>
      <div className="grid gap-2 p-4">
        <Button fullWidth onClick={() => props.onOpenSingle(instance.id)}>
          <ExternalLink className="size-4" /> 在单设备模式中打开
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => props.onDuplicate(instance.id)}>
            <Copy className="size-4" /> 复制
          </Button>
          <Button variant="danger" onClick={() => props.onDelete(instance.id)}>
            <Trash2 className="size-4" /> 删除
          </Button>
        </div>
      </div>
    </>
  );
}

const ALIGNMENTS: ReadonlyArray<{
  action: AlignmentAction;
  label: string;
  icon: ReactNode;
  needsThree?: boolean;
}> = [
  { action: 'align-left', label: '左对齐', icon: <AlignStartVertical className="size-4" /> },
  { action: 'align-right', label: '右对齐', icon: <AlignEndVertical className="size-4" /> },
  { action: 'align-top', label: '顶部对齐', icon: <AlignStartHorizontal className="size-4" /> },
  { action: 'align-bottom', label: '底部对齐', icon: <AlignEndHorizontal className="size-4" /> },
  {
    action: 'align-horizontal-center',
    label: '水平居中',
    icon: <AlignCenterVertical className="size-4" />,
  },
  {
    action: 'align-vertical-center',
    label: '垂直居中',
    icon: <AlignCenterHorizontal className="size-4" />,
  },
  {
    action: 'distribute-horizontal',
    label: '水平等距',
    icon: <AlignHorizontalDistributeCenter className="size-4" />,
    needsThree: true,
  },
  {
    action: 'distribute-vertical',
    label: '垂直等距',
    icon: <AlignVerticalDistributeCenter className="size-4" />,
    needsThree: true,
  },
];

function MultiSelectionSettings({ props }: { props: ComparePropertyPanelProps }) {
  const selected = props.selectedInstances;
  const [urlDraft, setUrlDraft] = useState(props.globalUrl);
  return (
    <>
      <Section title={`已选择 ${selected.length} 个设备`}>
        <div className="grid grid-cols-2 gap-2">
          <Button className="!text-xs" onClick={props.onRotateSelected}>
            <RotateCw className="size-3.5" /> 批量切换方向
          </Button>
          <Button className="!text-xs" onClick={() => props.onUpdateSelected({ scale: 1 })}>
            重置实例缩放
          </Button>
        </div>
      </Section>
      <Section title="批量显示">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="!px-1 !text-xs"
            onClick={() => props.onUpdateSelected({ safeAreaVisible: true })}
          >
            显示安全区
          </Button>
          <Button
            className="!px-1 !text-xs"
            onClick={() => props.onUpdateSelected({ safeAreaVisible: false })}
          >
            隐藏安全区
          </Button>
          <Button
            className="!px-1 !text-xs"
            onClick={() => props.onUpdateSelected({ frameVisible: true })}
          >
            显示边框
          </Button>
          <Button
            className="!px-1 !text-xs"
            onClick={() => props.onUpdateSelected({ frameVisible: false })}
          >
            隐藏边框
          </Button>
        </div>
      </Section>
      <Section title="批量 URL">
        <div className="flex gap-2">
          <input
            value={urlDraft}
            placeholder="输入 URL"
            className={inputClass}
            onChange={(event) => setUrlDraft(event.target.value)}
          />
          <Button className="!px-2 !text-xs" onClick={() => props.onLoadSelectedUrl(urlDraft)}>
            应用
          </Button>
        </div>
      </Section>
      <Section title="对齐与分布">
        <div className="grid grid-cols-2 gap-2">
          {ALIGNMENTS.map((item) => (
            <Button
              key={item.action}
              className="!justify-start !px-2 !text-xs"
              disabled={item.needsThree && selected.length < 3}
              onClick={() => props.onAlign(item.action)}
            >
              {item.icon} {item.label}
            </Button>
          ))}
        </div>
      </Section>
      <div className="p-4">
        <Button fullWidth variant="danger" onClick={props.onDeleteSelected}>
          <Trash2 className="size-4" /> 删除选中设备
        </Button>
      </div>
    </>
  );
}

export function ComparePropertyPanel(props: ComparePropertyPanelProps) {
  const selected = props.selectedInstances;
  const instance = selected[0];
  const profile = instance
    ? props.devices.find((device) => device.id === instance.deviceId)
    : undefined;

  return (
    <aside
      id="compare-property-panel"
      aria-label="对比属性面板"
      className="flex h-full w-[330px] shrink-0 flex-col border-l border-[#e7e7ec] bg-white"
    >
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#ececf0] px-4">
        <div>
          <h2 className="text-base font-semibold text-[#202127]">
            {selected.length === 0 ? '画布设置' : selected.length === 1 ? '设备实例' : '批量编辑'}
          </h2>
          <p className="mt-0.5 text-[10px] text-[#858790]">
            {selected.length === 0 ? '未选择设备' : `已选择 ${selected.length} 个设备`}
          </p>
        </div>
        <IconButton
          label="收起属性面板"
          size="sm"
          aria-controls="compare-property-panel"
          aria-expanded="true"
          className="max-[1160px]:hidden"
          onClick={props.onCollapse}
        >
          <PanelRightClose className="size-4" />
        </IconButton>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected.length === 0 ? <CanvasSettings {...props} /> : null}
        {selected.length === 1 && instance ? (
          <SingleInstanceSettings
            key={instance.id}
            instance={instance}
            profile={profile}
            props={props}
          />
        ) : null}
        {selected.length > 1 ? <MultiSelectionSettings props={props} /> : null}
      </div>
    </aside>
  );
}
