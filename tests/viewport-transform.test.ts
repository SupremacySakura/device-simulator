import { describe, expect, it } from 'vitest';
import type { DeviceProfile } from '../types/device';
import {
  AUTO_ZOOM_PADDING,
  FRAME_BEZEL,
  MAX_ZOOM,
  MIN_ZOOM,
  calculateAutoZoom,
  clampZoom,
  getOrientedViewport,
  resolveZoom,
  toDeviceLayout,
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
  it('窗口足够大时不放大超过 100%', () => {
    expect(calculateAutoZoom(device().portrait, { width: 4000, height: 4000 })).toBe(1);
  });

  it('窗口较窄时按宽度缩放并留出边距', () => {
    const zoom = calculateAutoZoom(device().portrait, { width: 300, height: 2000 });
    expect(zoom).toBeCloseTo((300 - AUTO_ZOOM_PADDING * 2) / (393 + FRAME_BEZEL * 2), 5);
  });

  it('机身留白也计入适应尺寸，设备不会被裁切', () => {
    const viewport = device().portrait;
    const windowSize = { width: 500, height: 1000 };
    const frameWidth = viewport.width + FRAME_BEZEL * 2;
    const frameHeight = viewport.height + FRAME_BEZEL * 2;
    const zoom = calculateAutoZoom(viewport, windowSize);

    expect(zoom * frameWidth).toBeLessThanOrEqual(windowSize.width - AUTO_ZOOM_PADDING * 2);
    expect(zoom * frameHeight).toBeLessThanOrEqual(windowSize.height - AUTO_ZOOM_PADDING * 2);
    // 只按视口宽度计算会得到更大的缩放，那会让机身留白超出窗口。
    expect(zoom).toBeLessThan((windowSize.width - AUTO_ZOOM_PADDING * 2) / viewport.width);
  });

  it('窗口过小时回落到最小缩放', () => {
    expect(calculateAutoZoom(device().portrait, { width: 10, height: 10 })).toBe(MIN_ZOOM);
  });
});

describe('resolveZoom', () => {
  it('自动模式忽略手动值', () => {
    const zoom = resolveZoom(device().portrait, { width: 300, height: 2000 }, 'auto', 2);
    expect(zoom).toBeLessThan(2);
  });

  it('手动模式使用并限制手动值', () => {
    expect(resolveZoom(device().portrait, { width: 300, height: 2000 }, 'manual', 9)).toBe(
      MAX_ZOOM,
    );
  });
});

describe('toDeviceLayout', () => {
  it('iframe 视口严格等于设备视口，缩放不参与', () => {
    const layout = toDeviceLayout(device(), 'portrait', 0.5);
    expect(layout.viewport).toEqual({ width: 393, height: 852 });
  });

  it('缩放只作用于外层', () => {
    expect(toDeviceLayout(device(), 'portrait', 0.5).scale).toBe(0.5);
    expect(toDeviceLayout(device(), 'portrait', 99).scale).toBe(MAX_ZOOM);
  });

  it('外框尺寸包含机身留白', () => {
    const layout = toDeviceLayout(device(), 'portrait', 1);
    expect(layout.frame.width).toBe(393 + FRAME_BEZEL * 2);
    expect(layout.frame.height).toBe(852 + FRAME_BEZEL * 2);
  });

  it('横屏时视口与外框同步旋转', () => {
    const layout = toDeviceLayout(device(), 'landscape', 1);
    expect(layout.viewport).toEqual({ width: 852, height: 393 });
    expect(layout.frame.width).toBe(852 + FRAME_BEZEL * 2);
  });

  it('遮挡层沿用设备安全区，用于绘制刘海而非收缩视口', () => {
    expect(toDeviceLayout(device(), 'portrait', 1).mask).toEqual({
      top: 59,
      right: 0,
      bottom: 34,
      left: 0,
    });
    expect(toDeviceLayout(device(), 'landscape', 1).mask).toEqual({
      top: 0,
      right: 59,
      bottom: 0,
      left: 34,
    });
  });

  it('无刘海设备不产生遮挡', () => {
    const se = device({
      portrait: { width: 375, height: 667, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } },
    });
    expect(toDeviceLayout(se, 'portrait', 1).mask).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });
});
