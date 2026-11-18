import { describe, expect, it } from 'vitest';
import type { DeviceProfile } from '../types/device';
import {
  AUTO_ZOOM_PADDING,
  MAX_ZOOM,
  MIN_ZOOM,
  calculateAutoZoom,
  clampZoom,
  getOrientedViewport,
  resolveZoom,
  toEmulationMetrics,
  toSafeAreaOverride,
} from '../utils/viewport-transform';

function device(overrides: Partial<DeviceProfile> = {}): DeviceProfile {
  return {
    id: 'test',
    name: 'Test',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: { width: 393, height: 852, safeArea: { top: 59, right: 0, bottom: 34, left: 0 } },
    landscape: { width: 852, height: 393, safeArea: { top: 0, right: 59, bottom: 0, left: 34 } },
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('getOrientedViewport', () => {
  it('按方向返回对应视口，不交换宽高', () => {
    const profile = device();
    expect(getOrientedViewport(profile, 'portrait').width).toBe(393);
    expect(getOrientedViewport(profile, 'landscape').width).toBe(852);
  });
});

describe('clampZoom', () => {
  it('限制在 10% 到 300%', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(0.75)).toBe(0.75);
  });

  it('拒绝非有限数字', () => {
    expect(() => clampZoom(Number.NaN)).toThrow(RangeError);
  });
});

describe('calculateAutoZoom', () => {
  it('在窗口足够大时不放大超过 100%', () => {
    expect(calculateAutoZoom(device().portrait, { width: 4000, height: 4000 })).toBe(1);
  });

  it('在窗口较小时按最小边缩放并留出边距', () => {
    const zoom = calculateAutoZoom(device().portrait, { width: 300, height: 1000 });
    const expected = (300 - AUTO_ZOOM_PADDING * 2) / 393;
    expect(zoom).toBeCloseTo(expected, 5);
  });

  it('窗口过小时回落到最小缩放', () => {
    expect(calculateAutoZoom(device().portrait, { width: 10, height: 10 })).toBe(MIN_ZOOM);
  });
});

describe('resolveZoom', () => {
  it('自动模式忽略手动值', () => {
    const zoom = resolveZoom(device().portrait, { width: 500, height: 1000 }, 'auto', 2);
    expect(zoom).toBeLessThan(2);
  });

  it('手动模式使用并限制手动值', () => {
    expect(resolveZoom(device().portrait, { width: 500, height: 1000 }, 'manual', 9)).toBe(
      MAX_ZOOM,
    );
  });
});

describe('toEmulationMetrics', () => {
  it('竖屏映射为 portraitPrimary 且角度为 0', () => {
    const metrics = toEmulationMetrics(device(), 'portrait', 0.6);
    expect(metrics).toMatchObject({
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      scale: 0.6,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 },
    });
  });

  it('横屏映射为 landscapePrimary 且角度为 90', () => {
    const metrics = toEmulationMetrics(device(), 'landscape', 1);
    expect(metrics).toMatchObject({
      width: 852,
      height: 393,
      screenOrientation: { type: 'landscapePrimary', angle: 90 },
    });
  });

  it('平板不标记为 mobile', () => {
    expect(toEmulationMetrics(device({ category: 'tablet' }), 'portrait', 1).mobile).toBe(false);
  });

  it('缩放被限制在合法区间', () => {
    expect(toEmulationMetrics(device(), 'portrait', 99).scale).toBe(MAX_ZOOM);
  });
});

describe('toSafeAreaOverride', () => {
  it('竖屏返回竖屏安全区', () => {
    expect(toSafeAreaOverride(device(), 'portrait')).toEqual({
      top: 59,
      right: 0,
      bottom: 34,
      left: 0,
    });
  });

  it('横屏返回旋转后的安全区', () => {
    expect(toSafeAreaOverride(device(), 'landscape')).toEqual({
      top: 0,
      right: 59,
      bottom: 0,
      left: 34,
    });
  });

  it('全零安全区返回 null，表示无需覆盖', () => {
    const zero = device({
      portrait: { width: 375, height: 667, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } },
    });
    expect(toSafeAreaOverride(zero, 'portrait')).toBeNull();
  });
});
