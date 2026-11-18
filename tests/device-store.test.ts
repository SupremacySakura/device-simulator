import { beforeEach, describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import { buildCustomDevice, rotateSafeArea, useDeviceStore } from '../stores/device-store';

describe('device store', () => {
  beforeEach(() => {
    useDeviceStore.getState().hydrate(null);
  });

  it('初始包含全部系统设备且默认选中第一台', () => {
    const state = useDeviceStore.getState();
    expect(state.devices).toHaveLength(SYSTEM_DEVICES.length);
    expect(state.currentDeviceId).toBe(SYSTEM_DEVICES[0]?.id);
  });

  it('新增自定义设备后自动选中', () => {
    const created = useDeviceStore.getState().addCustomDevice({
      name: '我的测试机',
      width: 400,
      height: 800,
      safeArea: { top: 20, right: 0, bottom: 10, left: 0 },
    });
    const state = useDeviceStore.getState();
    expect(state.currentDeviceId).toBe(created.id);
    expect(state.devices.some((device) => device.id === created.id)).toBe(true);
  });

  it('系统设备不可删除', () => {
    expect(useDeviceStore.getState().removeDevice(SYSTEM_DEVICES[0]!.id)).toBe(false);
    expect(useDeviceStore.getState().devices).toHaveLength(SYSTEM_DEVICES.length);
  });

  it('可以删除自定义设备并回落到第一台系统设备', () => {
    const created = useDeviceStore.getState().addCustomDevice({
      name: '临时',
      width: 400,
      height: 800,
      safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    expect(useDeviceStore.getState().removeDevice(created.id)).toBe(true);
    expect(useDeviceStore.getState().currentDeviceId).toBe(SYSTEM_DEVICES[0]?.id);
  });

  it('hydrate 只恢复自定义设备，系统设备始终来自常量', () => {
    useDeviceStore.getState().hydrate({
      customDevices: [
        buildCustomDevice(
          { name: 'X', width: 1, height: 1, safeArea: { top: 0, right: 0, bottom: 0, left: 0 } },
          'x',
        ),
      ],
      currentDeviceId: 'x',
    });
    const state = useDeviceStore.getState();
    expect(state.devices).toHaveLength(SYSTEM_DEVICES.length + 1);
    expect(state.currentDeviceId).toBe('x');
  });
});

describe('rotateSafeArea', () => {
  it('顺时针旋转：上边缘转到右边缘，与真机横屏方向一致', () => {
    expect(rotateSafeArea({ top: 1, right: 2, bottom: 3, left: 4 })).toEqual({
      top: 4,
      right: 1,
      bottom: 2,
      left: 3,
    });
  });

  it('与系统设备的横屏安全区保持一致', () => {
    const iphone = SYSTEM_DEVICES.find((device) => device.id === 'iphone-15')!;
    expect(rotateSafeArea(iphone.portrait.safeArea)).toEqual(iphone.landscape.safeArea);
  });
});

describe('buildCustomDevice', () => {
  it('横屏视口交换宽高并旋转安全区', () => {
    const device = buildCustomDevice(
      {
        name: 'Mine',
        width: 400,
        height: 900,
        safeArea: { top: 30, right: 0, bottom: 20, left: 0 },
      },
      'mine',
    );
    expect(device.landscape.width).toBe(900);
    expect(device.landscape.height).toBe(400);
    expect(device.landscape.safeArea).toEqual({ top: 0, right: 30, bottom: 0, left: 20 });
    expect(device.isSystem).toBe(false);
  });
});
