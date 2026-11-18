import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';

describe('system devices', () => {
  it('只包含手机与平板，数量控制在 8 到 12 台', () => {
    expect(SYSTEM_DEVICES.length).toBeGreaterThanOrEqual(8);
    expect(SYSTEM_DEVICES.length).toBeLessThanOrEqual(12);
    for (const device of SYSTEM_DEVICES) {
      expect(['phone', 'tablet']).toContain(device.category);
      expect(device.isSystem).toBe(true);
    }
  });

  it('id 唯一', () => {
    const ids = SYSTEM_DEVICES.map((device) => device.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每台设备横竖屏宽高互换', () => {
    for (const device of SYSTEM_DEVICES) {
      expect(device.landscape.width).toBe(device.portrait.height);
      expect(device.landscape.height).toBe(device.portrait.width);
    }
  });

  it('视口尺寸与 DPR 合法', () => {
    for (const device of SYSTEM_DEVICES) {
      expect(device.portrait.width).toBeGreaterThan(0);
      expect(device.portrait.height).toBeGreaterThan(0);
      expect(device.devicePixelRatio).toBeGreaterThanOrEqual(1);
    }
  });

  it('安全区不超过视口尺寸', () => {
    for (const device of SYSTEM_DEVICES) {
      for (const viewport of [device.portrait, device.landscape]) {
        const { safeArea } = viewport;
        expect(safeArea.top + safeArea.bottom).toBeLessThan(viewport.height);
        expect(safeArea.left + safeArea.right).toBeLessThan(viewport.width);
      }
    }
  });
});
