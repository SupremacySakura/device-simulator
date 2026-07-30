import { RotateCcw } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { SafeAreaInsets } from '../../types/device';
import { IconButton } from '../common/IconButton';

interface SafeAreaEditorProps {
  value: SafeAreaInsets;
  readOnly?: boolean;
  onChange: (value: SafeAreaInsets) => void;
  onReset?: () => void;
}

const FIELDS: ReadonlyArray<{
  key: keyof SafeAreaInsets;
  label: string;
  ariaLabel: string;
}> = [
  { key: 'top', label: '上', ariaLabel: '顶部安全区（像素）' },
  { key: 'right', label: '右', ariaLabel: '右侧安全区（像素）' },
  { key: 'bottom', label: '下', ariaLabel: '底部安全区（像素）' },
  { key: 'left', label: '左', ariaLabel: '左侧安全区（像素）' },
];

export function SafeAreaEditor({
  value,
  readOnly = false,
  onChange,
  onReset,
}: SafeAreaEditorProps) {
  const update = (key: keyof SafeAreaInsets) => (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(nextValue) || nextValue < 0) return;
    onChange({ ...value, [key]: nextValue });
  };

  return (
    <section className="border-t border-[#ececf0] px-4 py-4" aria-labelledby="safe-area-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="safe-area-heading" className="text-sm font-semibold text-[#292a31]">
            安全区
          </h3>
          <p className="mt-0.5 text-[11px] leading-4 text-[#8b8d96]">
            当前方向，单位为 CSS px；会从页面内容视口中留白，不等同于页面内 env()。
          </p>
        </div>
        {!readOnly && onReset ? (
          <IconButton label="恢复安全区原值" size="sm" onClick={onReset}>
            <RotateCcw className="size-3.5" aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      <div className="mb-3 grid grid-cols-[56px_1fr] items-center gap-3 rounded-xl border border-[#e7e7ec] bg-[#fafafd] p-3">
        <div
          className="relative mx-auto h-[74px] w-[42px] rounded-[9px] border-2 border-[#b9b5cb] bg-white"
          aria-hidden="true"
        >
          <span className="absolute inset-x-1 top-1 h-2 rounded bg-[#dcd5ff]" />
          <span className="absolute inset-x-1 bottom-1 h-1.5 rounded bg-[#dcd5ff]" />
          <span className="absolute top-4 bottom-3 left-1 w-1 rounded bg-[#eeeaff]" />
          <span className="absolute top-4 right-1 bottom-3 w-1 rounded bg-[#eeeaff]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map((field) => (
            <label
              key={field.key}
              className="grid grid-cols-[18px_1fr] items-center gap-1.5 text-xs text-[#666872]"
            >
              <span>{field.label}</span>
              <input
                type="number"
                min={0}
                step="any"
                value={value[field.key]}
                disabled={readOnly}
                aria-label={field.ariaLabel}
                onChange={update(field.key)}
                className="h-8 min-w-0 rounded-lg border border-[#dddde4] bg-white px-2 text-sm text-[#292a31] outline-none focus:border-[#8975f7] focus:ring-2 focus:ring-[#ebe7ff] disabled:bg-[#f2f2f5] disabled:text-[#858790]"
              />
            </label>
          ))}
        </div>
      </div>

      {readOnly ? (
        <p className="text-xs leading-5 text-[#858790]">系统设备的安全区为只读配置。</p>
      ) : null}
    </section>
  );
}
