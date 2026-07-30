import type { DeviceCategoryFilter } from '../../stores/device-store';
import { DEVICE_CATEGORY_TABS } from './device-category-tabs';

interface DeviceCategoryTabsProps {
  value: DeviceCategoryFilter;
  onChange: (value: DeviceCategoryFilter) => void;
}

export function DeviceCategoryTabs({ value, onChange }: DeviceCategoryTabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="设备分类">
      {DEVICE_CATEGORY_TABS.map((category) => (
        <button
          key={category.id}
          type="button"
          role="tab"
          aria-selected={value === category.id}
          className={`h-8 shrink-0 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            value === category.id
              ? 'border-[#d8d0ff] bg-[#f0edff] text-[#5d3df0]'
              : 'border-[#e5e5ea] bg-white text-[#555760] hover:bg-[#f7f7f9]'
          }`}
          onClick={() => onChange(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}
