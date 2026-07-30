import type { DeviceCategoryFilter } from '../../stores/device-store';

export const DEVICE_CATEGORY_TABS: ReadonlyArray<{
  id: DeviceCategoryFilter;
  label: string;
}> = [
  { id: 'all', label: '全部' },
  { id: 'phone', label: '手机' },
  { id: 'tablet', label: '平板' },
  { id: 'foldable', label: '折叠屏' },
  { id: 'desktop', label: '桌面' },
  { id: 'custom', label: '自定义' },
];
