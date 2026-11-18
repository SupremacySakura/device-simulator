import { describe, expect, it } from 'vitest';
import { toEmulationMetrics, toSafeAreaOverride } from '../utils/viewport-transform';
import type { DeviceProfile } from '../types/device';

function device(): DeviceProfile {
  return {
    id: 'iphone-15',
    name: 'iPhone 15',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: { width: 393, height: 852, safeArea: { top: 59, right: 0, bottom: 34, left: 0 } },
    landscape: { width: 852, height: 393, safeArea: { top: 0, right: 59, bottom: 0, left: 34 } },
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('预览会话应用参数', () => {
  it('同一设备在竖屏与横屏产生不同的 CDP 参数', () => {
    const portrait = toEmulationMetrics(device(), 'portrait', 1);
    const landscape = toEmulationMetrics(device(), 'landscape', 1);
    expect([portrait.width, portrait.height]).toEqual([393, 852]);
    expect([landscape.width, landscape.height]).toEqual([852, 393]);
    expect(portrait.screenOrientation.type).toBe('portraitPrimary');
    expect(landscape.screenOrientation.type).toBe('landscapePrimary');
  });

  it('旋转后安全区随之换边，而不是沿用竖屏值', () => {
    expect(toSafeAreaOverride(device(), 'portrait')).toEqual({
      top: 59,
      right: 0,
      bottom: 34,
      left: 0,
    });
    expect(toSafeAreaOverride(device(), 'landscape')).toEqual({
      top: 0,
      right: 59,
      bottom: 0,
      left: 34,
    });
  });

  it('退出预览时可生成归零的安全区参数', () => {
    const cleared = { top: 0, right: 0, bottom: 0, left: 0 };
    const zeroDevice = device();
    zeroDevice.portrait.safeArea = cleared;
    expect(toSafeAreaOverride(zeroDevice, 'portrait')).toBeNull();
  });
});
