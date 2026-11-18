import { create } from 'zustand';
import { DEFAULT_DEVICE_ID, SYSTEM_DEVICES } from '../constants/default-devices';
import type { DeviceProfile, DeviceViewport, SafeAreaInsets } from '../types/device';

export interface CustomDeviceInput {
  name: string;
  width: number;
  height: number;
  safeArea: SafeAreaInsets;
}

export interface PersistedDeviceData {
  customDevices: DeviceProfile[];
  currentDeviceId: string;
}

interface DeviceStoreState {
  devices: DeviceProfile[];
  currentDeviceId: string;
  hydrated: boolean;
  hydrate: (data: PersistedDeviceData | null) => void;
  setCurrentDevice: (id: string) => void;
  addCustomDevice: (input: CustomDeviceInput, id?: string) => DeviceProfile;
  removeDevice: (id: string) => boolean;
}

function cloneViewport(viewport: DeviceViewport): DeviceViewport {
  return { ...viewport, safeArea: { ...viewport.safeArea } };
}

export function cloneDevice(device: DeviceProfile): DeviceProfile {
  return {
    ...device,
    portrait: cloneViewport(device.portrait),
    landscape: cloneViewport(device.landscape),
  };
}

/**
 * 横屏安全区由竖屏顺时针旋转 90° 得到，与 CDP 的 landscapePrimary/angle 90 一致：
 * 竖屏上边缘转到横屏右边缘，下边缘转到左边缘。
 */
export function rotateSafeArea(insets: SafeAreaInsets): SafeAreaInsets {
  return { top: insets.left, right: insets.top, bottom: insets.right, left: insets.bottom };
}

export function buildCustomDevice(
  input: CustomDeviceInput,
  id: string,
  now = Date.now(),
): DeviceProfile {
  const safeArea: SafeAreaInsets = { ...input.safeArea };
  return {
    id,
    name: input.name.trim(),
    category: 'custom',
    devicePixelRatio: 1,
    portrait: { width: input.width, height: input.height, safeArea },
    landscape: {
      width: input.height,
      height: input.width,
      safeArea: rotateSafeArea(safeArea),
    },
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
}

function mergeDevices(data: PersistedDeviceData | null): DeviceProfile[] {
  const systems = SYSTEM_DEVICES.map(cloneDevice);
  const systemIds = new Set(systems.map((device) => device.id));
  const customs = (data?.customDevices ?? [])
    .filter((device) => !systemIds.has(device.id))
    .map((device) => ({ ...cloneDevice(device), isSystem: false }));
  return [...systems, ...customs];
}

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  devices: mergeDevices(null),
  currentDeviceId: DEFAULT_DEVICE_ID,
  hydrated: false,

  hydrate: (data) => {
    const devices = mergeDevices(data);
    const requestedId = data?.currentDeviceId;
    const currentDeviceId =
      requestedId && devices.some((device) => device.id === requestedId)
        ? requestedId
        : (devices[0]?.id ?? '');
    set({ devices, currentDeviceId, hydrated: true });
  },

  setCurrentDevice: (id) => {
    if (get().devices.some((device) => device.id === id)) set({ currentDeviceId: id });
  },

  addCustomDevice: (input, id = crypto.randomUUID()) => {
    const device = buildCustomDevice(input, id);
    set((state) => ({
      devices: [...state.devices.filter((item) => item.id !== device.id), device],
      currentDeviceId: device.id,
    }));
    return device;
  },

  removeDevice: (id) => {
    const existing = get().devices.find((device) => device.id === id);
    if (!existing || existing.isSystem) return false;
    set((state) => {
      const devices = state.devices.filter((device) => device.id !== id);
      return {
        devices,
        currentDeviceId:
          state.currentDeviceId === id ? (devices[0]?.id ?? '') : state.currentDeviceId,
      };
    });
    return true;
  },
}));

export function selectCurrentDevice(state: DeviceStoreState): DeviceProfile | undefined {
  return state.devices.find((device) => device.id === state.currentDeviceId);
}

export function serializeDeviceStore(state: DeviceStoreState): PersistedDeviceData {
  return {
    customDevices: state.devices.filter((device) => !device.isSystem).map(cloneDevice),
    currentDeviceId: state.currentDeviceId,
  };
}
