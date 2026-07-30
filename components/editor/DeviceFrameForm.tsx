import type { ChangeEvent } from 'react';
import type { DeviceFrameConfig, DeviceFrameInsets } from '../../types/device';
import { TextField } from '../common/FormField';

interface DeviceFrameFormProps {
  value: DeviceFrameConfig;
  errors: Readonly<Record<string, string>>;
  onChange: (value: DeviceFrameConfig) => void;
}

function errorProps(errors: Readonly<Record<string, string>>, path: string) {
  const error = errors[path];
  return error === undefined ? {} : { error };
}

export function DeviceFrameForm({ value, errors, onChange }: DeviceFrameFormProps) {
  const updateNumber =
    (key: 'borderRadius' | 'borderWidth') => (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.valueAsNumber;
      if (!Number.isFinite(next)) return;
      onChange({ ...value, [key]: next });
    };

  const updateInset = (key: keyof DeviceFrameInsets) => (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(next)) return;
    onChange({ ...value, insets: { ...value.insets, [key]: next } });
  };

  const updateShadow = (shadow: string) => {
    const next = { ...value };
    if (shadow.trim()) next.shadow = shadow;
    else delete next.shadow;
    onChange(next);
  };

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-[#e7e7ec] bg-[#fafafd] p-4">
        <h3 className="text-sm font-semibold text-[#2f3037]">设备外壳与边框</h3>
        <p className="mt-1 text-xs leading-5 text-[#7c7e87]">
          外壳包围真实 CSS 视口；边距不会改变 iframe 的宽高或媒体查询结果。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e7e7ec] bg-white px-4 py-3 text-sm text-[#3c3d44]">
          <span>
            <span className="block font-medium">显示设备外壳</span>
            <span className="mt-0.5 block text-xs text-[#858790]">包含外边距、颜色与边框</span>
          </span>
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(event) => onChange({ ...value, enabled: event.currentTarget.checked })}
            className="size-4 accent-[#6547f5]"
          />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e7e7ec] bg-white px-4 py-3 text-sm text-[#3c3d44]">
          <span>
            <span className="block font-medium">显示设备阴影</span>
            <span className="mt-0.5 block text-xs text-[#858790]">可在工作台设置中再次覆盖</span>
          </span>
          <input
            type="checkbox"
            checked={value.shadowEnabled}
            onChange={(event) => onChange({ ...value, shadowEnabled: event.currentTarget.checked })}
            className="size-4 accent-[#6547f5]"
          />
        </label>
      </div>

      <fieldset className="rounded-xl border border-[#e7e7ec] p-4">
        <legend className="px-1 text-sm font-semibold text-[#34353c]">
          屏幕到外壳边距（竖屏基准）
        </legend>
        <div className="mt-2 grid grid-cols-4 gap-3">
          {(
            [
              ['top', '上'],
              ['right', '右'],
              ['bottom', '下'],
              ['left', '左'],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              hint="px"
              type="number"
              min={0}
              step="any"
              value={value.insets[key]}
              {...errorProps(errors, `$.frame.insets.${key}`)}
              onChange={updateInset(key)}
            />
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="外壳圆角"
          hint="px"
          type="number"
          min={0}
          step="any"
          value={value.borderRadius}
          {...errorProps(errors, '$.frame.borderRadius')}
          onChange={updateNumber('borderRadius')}
        />
        <TextField
          label="边框宽度"
          hint="px"
          type="number"
          min={0}
          step="any"
          value={value.borderWidth}
          {...errorProps(errors, '$.frame.borderWidth')}
          onChange={updateNumber('borderWidth')}
        />
        <TextField
          label="外壳背景色"
          value={value.backgroundColor}
          maxLength={128}
          placeholder="#1c1c1e"
          {...errorProps(errors, '$.frame.backgroundColor')}
          onChange={(event) => onChange({ ...value, backgroundColor: event.currentTarget.value })}
        />
        <TextField
          label="边框颜色"
          value={value.borderColor}
          maxLength={128}
          placeholder="#494949"
          {...errorProps(errors, '$.frame.borderColor')}
          onChange={(event) => onChange({ ...value, borderColor: event.currentTarget.value })}
        />
      </div>

      <TextField
        label="CSS 阴影"
        value={value.shadow ?? ''}
        maxLength={256}
        placeholder="0 20px 60px rgba(0, 0, 0, 0.25)"
        {...errorProps(errors, '$.frame.shadow')}
        onChange={(event) => updateShadow(event.currentTarget.value)}
      />

      <div className="rounded-xl border border-[#e7e7ec] bg-[#f8f8fa] p-5">
        <div
          className="mx-auto h-28 w-20 bg-white"
          style={{
            borderRadius: Math.min(40, value.borderRadius),
            border: `${value.borderWidth}px solid ${value.borderColor}`,
            boxShadow: value.shadowEnabled ? (value.shadow ?? 'none') : 'none',
            outline: value.enabled ? `10px solid ${value.backgroundColor}` : 'none',
          }}
          aria-label="设备边框效果预览"
          role="img"
        />
      </div>
    </div>
  );
}
