import { describe, expect, it } from 'vitest';
import { MAX_MANUAL_SCALE, MIN_MANUAL_SCALE, clampManualScale } from '../utils/device-scale';

describe('clampManualScale', () => {
  it('限制在 10% 到 300% 之间', () => {
    expect(clampManualScale(0.001)).toBe(MIN_MANUAL_SCALE);
    expect(clampManualScale(99)).toBe(MAX_MANUAL_SCALE);
    expect(clampManualScale(0.75)).toBe(0.75);
  });

  it('拒绝非有限数字', () => {
    expect(() => clampManualScale(Number.NaN)).toThrow(RangeError);
    expect(() => clampManualScale(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
