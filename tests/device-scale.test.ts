import { describe, expect, it } from 'vitest';
import {
  MAX_AUTO_SCALE,
  MAX_MANUAL_SCALE,
  MIN_AUTO_SCALE,
  MIN_MANUAL_SCALE,
  calculateAutoScale,
  clampManualScale,
  clampScale,
  getScaledSize,
  isManualScale,
  stepManualScale,
} from '../utils/device-scale';

describe('calculateAutoScale', () => {
  it('fits content by the limiting canvas dimension', () => {
    expect(
      calculateAutoScale({
        availableWidth: 800,
        availableHeight: 600,
        contentWidth: 400,
        contentHeight: 800,
      }),
    ).toBe(0.75);
  });

  it('subtracts padding on all canvas sides before calculating scale', () => {
    expect(calculateAutoScale(500, 500, 400, 800, { padding: 50 })).toBe(0.5);
  });

  it('clamps very small and very large fit ratios to the supported range', () => {
    expect(calculateAutoScale(100, 100, 1000, 1000)).toBe(MIN_AUTO_SCALE);
    expect(calculateAutoScale(4000, 4000, 400, 400)).toBe(MAX_AUTO_SCALE);
  });

  it('returns the configured minimum when padding consumes the canvas', () => {
    expect(
      calculateAutoScale({
        availableWidth: 100,
        availableHeight: 80,
        contentWidth: 400,
        contentHeight: 800,
        padding: 50,
        minScale: 0.4,
        maxScale: 1.2,
      }),
    ).toBe(0.4);
  });

  it('rejects invalid dimensions and inverted clamp ranges', () => {
    expect(() => calculateAutoScale(0, 600, 400, 800)).toThrow(RangeError);
    expect(() => clampScale(1, 2, 1)).toThrow(RangeError);
  });

  it('calculates the visual size without changing the source viewport dimensions', () => {
    expect(getScaledSize(393, 852, 0.75)).toEqual({ width: 294.75, height: 639 });
  });

  it('supports continuous manual zoom with stable stepping and bounds', () => {
    expect(isManualScale(0.83)).toBe(true);
    expect(isManualScale(MIN_MANUAL_SCALE - 0.01)).toBe(false);
    expect(isManualScale(MAX_MANUAL_SCALE + 0.01)).toBe(false);
    expect(stepManualScale(0.83, 1)).toBe(0.93);
    expect(stepManualScale(0.83, -1, 0.05)).toBe(0.78);
    expect(clampManualScale(100)).toBe(MAX_MANUAL_SCALE);
    expect(clampManualScale(0.01)).toBe(MIN_MANUAL_SCALE);
  });
});
