import { beforeEach, describe, expect, it } from 'vitest';
import { useDeviceStore } from '../stores/device-store';
import { SYSTEM_DEVICES } from '../constants/default-devices';

describe('自定义设备接入', () => {
  beforeEach(() => {
    useDeviceStore.getState().hydrate(null);
  });

  it('新增后出现在设备列表中，可被工具条选中', () => {
    const created = useDeviceStore.getState().addCustomDevice({
      name: 'My Test Phone',
      width: 400,
      height: 860,
      safeArea: { top: 30, right: 0, bottom: 20, left: 0 },
    });
    const state = useDeviceStore.getState();
    expect(state.devices).toHaveLength(SYSTEM_DEVICES.length + 1);
    expect(state.devices.find((device) => device.id === created.id)?.name).toBe('My Test Phone');
    expect(state.currentDeviceId).toBe(created.id);
  });

  it('自定义设备的横屏安全区由竖屏旋转而来', () => {
    const created = useDeviceStore.getState().addCustomDevice({
      name: 'Rotate Me',
      width: 400,
      height: 860,
      safeArea: { top: 30, right: 0, bottom: 20, left: 0 },
    });
    expect(created.landscape.width).toBe(860);
    expect(created.landscape.height).toBe(400);
    expect(created.landscape.safeArea).toEqual({ top: 0, right: 30, bottom: 0, left: 20 });
  });
});
