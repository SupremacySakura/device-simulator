import type { ChangeEvent } from 'react';
import type { DeviceCategory, DeviceProfile } from '../../types/device';
import { SelectField, TextField } from '../common/FormField';

interface DeviceBasicFormProps {
  value: DeviceProfile;
  errors: Readonly<Record<string, string>>;
  onChange: (value: DeviceProfile) => void;
}

const CATEGORIES: ReadonlyArray<{ value: DeviceCategory; label: string }> = [
  { value: 'phone', label: '手机' },
  { value: 'tablet', label: '平板' },
  { value: 'desktop', label: '桌面' },
  { value: 'foldable', label: '折叠屏' },
  { value: 'custom', label: '自定义' },
];

function errorProps(errors: Readonly<Record<string, string>>, path: string) {
  const error = errors[path];
  return error === undefined ? {} : { error };
}

export function DeviceBasicForm({ value, errors, onChange }: DeviceBasicFormProps) {
  const updateOptionalText = (key: 'brand' | 'model' | 'userAgent', text: string) => {
    const trimmed = text.trim();
    if (key === 'brand') {
      const next = { ...value };
      delete next.brand;
      onChange(trimmed ? { ...next, brand: text } : next);
      return;
    }
    if (key === 'model') {
      const next = { ...value };
      delete next.model;
      onChange(trimmed ? { ...next, model: text } : next);
      return;
    }
    const next = { ...value };
    delete next.userAgent;
    onChange(trimmed ? { ...next, userAgent: text } : next);
  };

  const updateDpr = (event: ChangeEvent<HTMLInputElement>) => {
    const devicePixelRatio = event.currentTarget.valueAsNumber;
    if (!Number.isFinite(devicePixelRatio)) return;
    onChange({ ...value, devicePixelRatio });
  };

  const updateTags = (text: string) => {
    const tags = [
      ...new Set(
        text
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    onChange({ ...value, tags });
  };

  return (
    <div className="grid gap-5">
      <div className="rounded-xl border border-[#e7e7ec] bg-[#fafafd] p-4">
        <h3 className="text-sm font-semibold text-[#2f3037]">基本信息</h3>
        <p className="mt-1 text-xs leading-5 text-[#7c7e87]">
          名称、类别和 DPR 会显示在设备列表及属性面板中。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="设备名称"
          value={value.name}
          autoFocus
          maxLength={120}
          required
          {...errorProps(errors, '$.name')}
          onChange={(event) => onChange({ ...value, name: event.currentTarget.value })}
        />
        <SelectField
          label="设备分类"
          value={value.category}
          {...errorProps(errors, '$.category')}
          onChange={(event) =>
            onChange({
              ...value,
              category: event.currentTarget.value as DeviceCategory,
            })
          }
        >
          {CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </SelectField>
        <TextField
          label="品牌"
          value={value.brand ?? ''}
          maxLength={120}
          placeholder="例如 Apple"
          {...errorProps(errors, '$.brand')}
          onChange={(event) => updateOptionalText('brand', event.currentTarget.value)}
        />
        <TextField
          label="型号"
          value={value.model ?? ''}
          maxLength={120}
          placeholder="例如 iPhone 15 Pro"
          {...errorProps(errors, '$.model')}
          onChange={(event) => updateOptionalText('model', event.currentTarget.value)}
        />
        <TextField
          label="设备像素比（DPR）"
          type="number"
          min={0.1}
          step="any"
          value={value.devicePixelRatio}
          required
          {...errorProps(errors, '$.devicePixelRatio')}
          onChange={updateDpr}
        />
        <TextField
          label="标签"
          hint="逗号分隔"
          defaultValue={value.tags.join(', ')}
          placeholder="ios, phone, notch"
          {...errorProps(errors, '$.tags')}
          onChange={(event) => updateTags(event.currentTarget.value)}
        />
      </div>

      <TextField
        label="User Agent（可选）"
        value={value.userAgent ?? ''}
        maxLength={1024}
        placeholder="仅作为配置元数据；普通 iframe 无法强制覆盖 UA"
        {...errorProps(errors, '$.userAgent')}
        onChange={(event) => updateOptionalText('userAgent', event.currentTarget.value)}
      />

      <label className="flex items-center justify-between gap-4 rounded-xl border border-[#e7e7ec] bg-white px-4 py-3 text-sm text-[#3c3d44]">
        <span>
          <span className="block font-medium">创建后加入收藏</span>
          <span className="mt-0.5 block text-xs text-[#858790]">可随时在设备列表中切换</span>
        </span>
        <input
          type="checkbox"
          checked={value.favorite}
          onChange={(event) => onChange({ ...value, favorite: event.currentTarget.checked })}
          className="size-4 accent-[#6547f5]"
        />
      </label>
    </div>
  );
}
