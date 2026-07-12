import { describe, expect, it } from 'vitest';
import {
  calculateDraggedPan,
  calculateWheelZoomScale,
  calculateZoomedPan,
} from '../utils/canvas-transform';
import { MAX_MANUAL_SCALE, MIN_MANUAL_SCALE } from '../utils/device-scale';

describe('canvas viewport transforms', () => {
  it('moves the canvas by screen-space pointer distance regardless of zoom', () => {
    expect(calculateDraggedPan({ x: 30, y: -20 }, { x: 100, y: 100 }, { x: 145, y: 72 })).toEqual({
      x: 75,
      y: -48,
    });
  });

  it('keeps the world point under the pointer stable while zooming', () => {
    const pan = { x: 40, y: -15 };
    const focus = { x: 180, y: 90 };
    const currentScale = 0.75;
    const nextScale = 1.4;
    const nextPan = calculateZoomedPan(pan, focus, currentScale, nextScale);

    const worldBefore = {
      x: (focus.x - pan.x) / currentScale,
      y: (focus.y - pan.y) / currentScale,
    };
    const worldAfter = {
      x: (focus.x - nextPan.x) / nextScale,
      y: (focus.y - nextPan.y) / nextScale,
    };
    expect(worldAfter.x).toBeCloseTo(worldBefore.x, 10);
    expect(worldAfter.y).toBeCloseTo(worldBefore.y, 10);
  });

  it('zooms continuously in both directions and clamps extreme wheel input', () => {
    expect(calculateWheelZoomScale(1, -40)).toBeGreaterThan(1);
    expect(calculateWheelZoomScale(1, 40)).toBeLessThan(1);
    expect(calculateWheelZoomScale(1, -100_000)).toBe(MAX_MANUAL_SCALE);
    expect(calculateWheelZoomScale(1, 100_000)).toBe(MIN_MANUAL_SCALE);
  });

  it('rejects invalid scale and pointer data', () => {
    expect(() => calculateZoomedPan({ x: 0, y: 0 }, { x: 0, y: 0 }, 0, 1)).toThrow(RangeError);
    expect(() =>
      calculateDraggedPan({ x: Number.NaN, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }),
    ).toThrow(RangeError);
  });
});
