import { describe, expect, it } from 'vitest';
import { calculateAutoZoom, resolveZoom } from '../utils/viewport-transform';
import type { DeviceViewport } from '../types/device';

const iphone: DeviceViewport = {
  width: 393,
  height: 852,
  safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
};

describe('自动缩放的基准必须是真实窗口', () => {
  it('用真实内容区算出可容纳的比例', () => {
    const zoom = calculateAutoZoom(iphone, { width: 1400, height: 857 });
    expect(zoom).toBeCloseTo((857 - 64) / 852, 5);
    expect(zoom).toBeLessThan(1);
  });

  it('窗口足够高时才会放到 100%', () => {
    expect(calculateAutoZoom(iphone, { width: 1400, height: 1000 })).toBe(1);
  });

  it('窗口偏小时按高度收缩', () => {
    const zoom = calculateAutoZoom(iphone, { width: 900, height: 700 });
    expect(zoom).toBeCloseTo((700 - 64) / 852, 5);
  });

  it('若误用模拟后的视口(393x852)，比例会被高估', () => {
    const wrong = calculateAutoZoom(iphone, { width: 393, height: 852 });
    const right = calculateAutoZoom(iphone, { width: 900, height: 700 });
    expect(wrong).toBeGreaterThan(right);
  });

  it('手动模式不受窗口影响', () => {
    expect(resolveZoom(iphone, { width: 393, height: 852 }, 'manual', 0.5)).toBe(0.5);
  });
});
