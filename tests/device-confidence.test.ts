import { describe, expect, it } from 'vitest';
import { DEVICE_CATEGORY_TABS } from '../components/device/device-category-tabs';
import { getDeviceConfidencePresentation } from '../utils/device-confidence';

describe('device confidence presentation', () => {
  it.each([
    ['high', '高可信', 'success'],
    ['medium', '中可信', 'warning'],
    ['low', '低可信', 'danger'],
    ['unverified', '未验证', 'neutral'],
    [undefined, '未验证', 'neutral'],
  ] as const)('maps %s to visible copy and tone', (value, label, tone) => {
    expect(getDeviceConfidencePresentation(value)).toEqual({ label, tone });
  });

  it('offers a foldable category without changing existing category IDs', () => {
    expect(DEVICE_CATEGORY_TABS.map((item) => item.id)).toEqual([
      'all',
      'phone',
      'tablet',
      'foldable',
      'desktop',
      'custom',
    ]);
  });
});
