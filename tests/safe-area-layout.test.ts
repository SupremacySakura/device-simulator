import { describe, expect, it } from 'vitest';
import type { DeviceViewport } from '../types/device';
import { getDeviceContentRect } from '../utils/safe-area-layout';

function viewport(overrides: Partial<DeviceViewport> = {}): DeviceViewport {
  return {
    width: 393,
    height: 852,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    ...overrides,
  };
}

describe('getDeviceContentRect', () => {
  it('扣除四边安全区后得到内容矩形', () => {
    const rect = getDeviceContentRect(
      viewport({ safeArea: { top: 59, right: 10, bottom: 34, left: 6 } }),
    );
    expect(rect).toEqual({ x: 6, y: 59, width: 377, height: 759 });
  });

  it('无安全区时内容矩形等于视口', () => {
    const rect = getDeviceContentRect(
      viewport({ safeArea: { top: 0, right: 0, bottom: 0, left: 0 } }),
    );
    expect(rect).toEqual({ x: 0, y: 0, width: 393, height: 852 });
  });

  it('安全区过大时不产生负数尺寸', () => {
    const rect = getDeviceContentRect(
      viewport({ width: 10, height: 10, safeArea: { top: 8, right: 8, bottom: 8, left: 8 } }),
    );
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});
