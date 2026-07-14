import { describe, expect, it } from 'vitest';
import {
  calculateAxisScrollOffset,
  calculateAxisScrollProgress,
  calculateScrollOffset,
  calculateScrollProgress,
} from '../utils/scroll-progress';

describe('compare scroll progress', () => {
  it('calculates normalized progress and clamps overscroll', () => {
    expect(calculateAxisScrollProgress(750, 2000, 500)).toBe(0.5);
    expect(calculateAxisScrollProgress(-20, 2000, 500)).toBe(0);
    expect(calculateAxisScrollProgress(5000, 2000, 500)).toBe(1);
    expect(calculateAxisScrollProgress(0, 400, 500)).toBe(0);
  });

  it('maps the same progress to a page with a different height', () => {
    const sourceProgress = calculateScrollProgress({
      scrollTop: 750,
      scrollLeft: 100,
      scrollHeight: 2000,
      scrollWidth: 1000,
      viewportHeight: 500,
      viewportWidth: 500,
    });
    expect(sourceProgress).toEqual({ verticalProgress: 0.5, horizontalProgress: 0.2 });
    expect(
      calculateScrollOffset(sourceProgress, {
        scrollHeight: 5000,
        scrollWidth: 2000,
        viewportHeight: 1000,
        viewportWidth: 1000,
      }),
    ).toEqual({ scrollTop: 2000, scrollLeft: 200 });
  });

  it('returns zero when the target has no scroll range', () => {
    expect(calculateAxisScrollOffset(0.75, 400, 500)).toBe(0);
  });

  it('rejects non-finite metrics', () => {
    expect(() => calculateAxisScrollProgress(0, Number.NaN, 500)).toThrow(RangeError);
    expect(() => calculateAxisScrollOffset(Number.POSITIVE_INFINITY, 1000, 500)).toThrow(
      RangeError,
    );
  });
});
