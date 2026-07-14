import { describe, expect, it } from 'vitest';
import {
  boundsIntersect,
  calculateFitTransform,
  calculateInstancesBounds,
  normalizeBounds,
} from '../utils/canvas-bounds';
import { createCompareInstance, createCompareProfile } from './compare-fixtures';

const PHONE = createCompareProfile('phone', 100, 200);
const TABLET = createCompareProfile('tablet', 200, 100);
const PROFILES = { phone: PHONE, tablet: TABLET };

describe('compare canvas bounds and fit transform', () => {
  it('calculates the union of visual instance bounds', () => {
    const instances = [
      createCompareInstance('a', 'phone'),
      createCompareInstance('b', 'tablet', { position: { x: 200, y: 100 } }),
    ];
    expect(calculateInstancesBounds(instances, PROFILES)).toEqual({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 400,
      bottom: 200,
      width: 400,
      height: 200,
    });
  });

  it('fits and centers all instances with padding', () => {
    const instances = [
      createCompareInstance('a', 'phone'),
      createCompareInstance('b', 'tablet', { position: { x: 200, y: 100 } }),
    ];
    expect(calculateFitTransform(instances, PROFILES, { width: 1000, height: 600 }, 100)).toEqual({
      offsetX: 100,
      offsetY: 100,
      scale: 2,
    });
  });

  it('clamps tiny and huge content and returns the default for an empty canvas', () => {
    const huge = createCompareProfile('huge', 10_000, 10_000);
    const tiny = createCompareProfile('tiny', 10, 10);
    expect(
      calculateFitTransform(
        [createCompareInstance('huge-node', 'huge')],
        { huge },
        { width: 500, height: 500 },
        20,
      ).scale,
    ).toBe(0.2);
    expect(
      calculateFitTransform(
        [createCompareInstance('tiny-node', 'tiny')],
        { tiny },
        { width: 500, height: 500 },
        20,
      ).scale,
    ).toBe(2);
    expect(calculateFitTransform([], PROFILES, { width: 500, height: 500 }, 20)).toEqual({
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    });
  });

  it('includes a recoverable placeholder when an instance profile no longer exists', () => {
    const valid = createCompareInstance('valid', 'phone', { position: { x: 10, y: 20 } });
    const missing = createCompareInstance('missing', 'deleted', {
      position: { x: -1000, y: -1000 },
    });
    expect(calculateInstancesBounds([valid, missing], PROFILES)).toEqual(
      expect.objectContaining({ left: -1000, top: -1000, right: 110, bottom: 220 }),
    );
  });

  it('normalizes selection rectangles and treats touching edges as intersecting', () => {
    const selection = normalizeBounds({ x: 100, y: 80 }, { x: 20, y: 10 });
    expect(selection).toEqual({
      x: 20,
      y: 10,
      left: 20,
      top: 10,
      right: 100,
      bottom: 80,
      width: 80,
      height: 70,
    });
    expect(boundsIntersect(selection, { left: 100, top: 20, right: 140, bottom: 40 })).toBe(true);
    expect(boundsIntersect(selection, { left: 101, top: 20, right: 140, bottom: 40 })).toBe(false);
  });
});
