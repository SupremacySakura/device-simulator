import { describe, expect, it } from 'vitest';
import {
  getDeviceOuterSize,
  getInstanceBounds,
  getInstanceBoundsOrFallback,
  getInstanceVisualSize,
} from '../utils/instance-size';
import { createCompareInstance, createCompareProfile } from './compare-fixtures';

const PROFILE = createCompareProfile('framed', 100, 200, {
  enabled: true,
  insets: { top: 2, right: 3, bottom: 4, left: 5 },
  borderRadius: 12,
  backgroundColor: '#000000',
  borderColor: '#333333',
  borderWidth: 1,
  shadowEnabled: true,
  shadow: '0 4px 10px #00000044',
});

describe('compare instance visual size', () => {
  it('includes visible frame insets and rotates them with the device', () => {
    expect(getDeviceOuterSize(PROFILE, 'portrait', true)).toEqual({ width: 110, height: 208 });
    expect(getDeviceOuterSize(PROFILE, 'landscape', true)).toEqual({ width: 208, height: 110 });
  });

  it('excludes a hidden frame and applies only instance scale', () => {
    const instance = createCompareInstance('one', PROFILE.id, {
      scale: 1.5,
      frameVisible: false,
    });
    expect(getInstanceVisualSize(instance, PROFILE)).toEqual({ width: 150, height: 300 });
  });

  it('returns complete bounds in canvas coordinates', () => {
    const instance = createCompareInstance('one', PROFILE.id, {
      position: { x: -20, y: 30 },
      scale: 2,
    });
    expect(getInstanceBounds(instance, PROFILE)).toEqual({
      x: -20,
      y: 30,
      left: -20,
      top: 30,
      right: 200,
      bottom: 446,
      centerX: 90,
      centerY: 238,
      width: 220,
      height: 416,
    });
  });

  it('rejects a non-positive instance scale', () => {
    const instance = createCompareInstance('one', PROFILE.id, { scale: 0 });
    expect(() => getInstanceVisualSize(instance, PROFILE)).toThrow(RangeError);
  });

  it('uses the recovery-card dimensions for a missing profile', () => {
    const instance = createCompareInstance('missing-node', 'missing-profile', {
      position: { x: 40, y: 50 },
    });
    expect(getInstanceBoundsOrFallback(instance, undefined)).toMatchObject({
      left: 40,
      top: 50,
      right: 320,
      bottom: 230,
      width: 280,
      height: 180,
    });
  });
});
