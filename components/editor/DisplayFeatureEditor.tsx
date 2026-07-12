import { Eye, EyeOff, Minus, Plus, Trash2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import type { DisplayFeature } from '../../types/device';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IconButton } from '../common/IconButton';

interface DisplayFeatureEditorProps {
  features: readonly DisplayFeature[];
  selectedFeatureId: string | null;
  readOnly?: boolean;
  onSelectFeature: (id: string | null) => void;
  onAddHomeIndicator: () => void;
  onChangeFeature: (feature: DisplayFeature) => void;
  onDeleteFeature: (id: string) => void;
}

interface CompactNumberFieldProps {
  label: string;
  value: number;
  min?: number;
  disabled: boolean;
  onChange: (value: number) => void;
}

const FEATURE_LABELS: Record<DisplayFeature['type'], string> = {
  'home-indicator': 'Home Indicator',
  speaker: '扬声器',
  hinge: '铰链',
  custom: '自定义特征',
};

function CompactNumberField({ label, value, min, disabled, onChange }: CompactNumberFieldProps) {
  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(next) || (min !== undefined && next < min)) return;
    onChange(next);
  };

  return (
    <label className="grid gap-1 text-[11px] font-medium text-[#666872]">
      {label}
      <input
        type="number"
        step="any"
        value={value}
        disabled={disabled}
        {...(min === undefined ? {} : { min })}
        onChange={update}
        className="h-8 min-w-0 rounded-lg border border-[#dddde4] bg-white px-2 text-xs text-[#292a31] outline-none focus:border-[#8975f7] focus:ring-2 focus:ring-[#ebe7ff] disabled:bg-[#f2f2f5] disabled:text-[#858790]"
      />
    </label>
  );
}

export function DisplayFeatureEditor({
  features,
  selectedFeatureId,
  readOnly = false,
  onSelectFeature,
  onAddHomeIndicator,
  onChangeFeature,
  onDeleteFeature,
}: DisplayFeatureEditorProps) {
  const [pendingDelete, setPendingDelete] = useState<DisplayFeature | null>(null);
  const selected = features.find((feature) => feature.id === selectedFeatureId) ?? null;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteFeature(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <section
      className="border-t border-[#ececf0] px-4 py-4"
      aria-labelledby="display-feature-heading"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="display-feature-heading" className="text-sm font-semibold text-[#292a31]">
            其他显示特征
          </h3>
          <p className="mt-0.5 text-[11px] text-[#8b8d96]">Home Indicator、扬声器或铰链</p>
        </div>
        <Button
          className="!h-8 !px-2 !text-xs"
          disabled={readOnly}
          aria-label="添加 Home Indicator"
          onClick={onAddHomeIndicator}
        >
          <Plus className="size-3.5" aria-hidden="true" /> 添加
        </Button>
      </div>

      <div className="grid gap-2">
        {features.map((feature) => {
          const active = feature.id === selectedFeatureId;
          return (
            <div
              key={feature.id}
              className={`flex min-h-[58px] items-center gap-2 rounded-xl border p-2 transition-colors ${
                active
                  ? 'border-[#d8cffc] bg-[#f5f2ff]'
                  : 'border-[#e7e7ec] bg-white hover:border-[#dcd8ee]'
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                aria-pressed={active}
                onClick={() => onSelectFeature(feature.id)}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f3f3f6]">
                  <Minus
                    className="size-6"
                    strokeWidth={5}
                    style={{
                      color: feature.style?.backgroundColor ?? '#111216',
                      opacity: feature.visible ? (feature.style?.opacity ?? 1) : 0.28,
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[#37383f]">
                    {feature.name}
                  </span>
                  <span className="mt-1 block text-[10px] text-[#858790]">
                    {FEATURE_LABELS[feature.type]} · {feature.width} × {feature.height}
                  </span>
                </span>
              </button>
              <IconButton
                label={feature.visible ? `隐藏 ${feature.name}` : `显示 ${feature.name}`}
                size="sm"
                active={feature.visible}
                disabled={readOnly}
                onClick={() => onChangeFeature({ ...feature, visible: !feature.visible })}
              >
                {feature.visible ? (
                  <Eye className="size-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                )}
              </IconButton>
              {!readOnly ? (
                <IconButton
                  label={`删除 ${feature.name}`}
                  size="sm"
                  className="hover:!bg-[#fff0f0] hover:!text-[#c43838]"
                  onClick={() => setPendingDelete(feature)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </IconButton>
              ) : null}
            </div>
          );
        })}

        {features.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dcdce3] bg-[#fafafd] px-3 py-4 text-center text-xs text-[#777984]">
            当前方向没有其他显示特征
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 rounded-xl border border-[#ded9f8] bg-[#faf9ff] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-[#393740]">位置与尺寸</h4>
            <button
              type="button"
              className="text-[11px] font-medium text-[#6547f5] hover:underline"
              onClick={() => onSelectFeature(null)}
            >
              收起
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <CompactNumberField
              label="X"
              value={selected.x}
              disabled={readOnly}
              onChange={(x) => onChangeFeature({ ...selected, x })}
            />
            <CompactNumberField
              label="Y"
              value={selected.y}
              disabled={readOnly}
              onChange={(y) => onChangeFeature({ ...selected, y })}
            />
            <CompactNumberField
              label="宽度"
              value={selected.width}
              min={0.1}
              disabled={readOnly}
              onChange={(width) => onChangeFeature({ ...selected, width })}
            />
            <CompactNumberField
              label="高度"
              value={selected.height}
              min={0.1}
              disabled={readOnly}
              onChange={(height) => onChangeFeature({ ...selected, height })}
            />
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除显示特征"
        message={`确定删除“${pendingDelete?.name ?? ''}”吗？此操作会立即保存到当前设备。`}
        confirmLabel="删除"
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </section>
  );
}
