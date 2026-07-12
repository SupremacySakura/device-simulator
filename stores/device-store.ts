import { create } from 'zustand';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import type { DeviceCategory, DeviceProfile } from '../types/device';
import { cloneDeviceProfile, copyDeviceAsCustom } from '../utils/device-profile';

export type DeviceCategoryFilter = DeviceCategory | 'all';

export interface PersistedDeviceData {
  customDevices: DeviceProfile[];
  favoriteIds: string[];
  currentDeviceId: string;
}

interface DeviceStoreState {
  devices: DeviceProfile[];
  currentDeviceId: string;
  searchQuery: string;
  categoryFilter: DeviceCategoryFilter;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  hydrate: (data: PersistedDeviceData | null) => void;
  setCurrentDevice: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: DeviceCategoryFilter) => void;
  toggleFavorite: (id: string) => void;
  addDevice: (device: DeviceProfile) => void;
  updateDevice: (device: DeviceProfile) => boolean;
  removeDevice: (id: string) => boolean;
  duplicateDevice: (id: string, name?: string) => DeviceProfile | null;
  replaceCustomDevices: (devices: DeviceProfile[]) => void;
}

function mergeDevices(data: PersistedDeviceData | null): DeviceProfile[] {
  const favoriteIds = new Set(data?.favoriteIds ?? []);
  const usePresetFavorites = data === null;
  const systems = SYSTEM_DEVICES.map((device) => ({
    ...cloneDeviceProfile(device),
    favorite: usePresetFavorites ? device.favorite : favoriteIds.has(device.id),
  }));
  const systemIds = new Set(systems.map((device) => device.id));
  const customs = (data?.customDevices ?? [])
    .filter((device) => !systemIds.has(device.id))
    .map((device) => ({
      ...cloneDeviceProfile(device),
      isSystem: false,
      favorite: usePresetFavorites ? device.favorite : favoriteIds.has(device.id),
    }));
  return [...systems, ...customs];
}

export const useDeviceStore = create<DeviceStoreState>((set, get) => ({
  devices: mergeDevices(null),
  currentDeviceId: SYSTEM_DEVICES[0]?.id ?? '',
  searchQuery: '',
  categoryFilter: 'all',
  hydrated: false,

  setHydrated: (value) => set({ hydrated: value }),

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

  setSearchQuery: (query) => set({ searchQuery: query }),
  setCategoryFilter: (category) => set({ categoryFilter: category }),

  toggleFavorite: (id) =>
    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === id ? { ...device, favorite: !device.favorite } : device,
      ),
    })),

  addDevice: (device) => {
    const custom = { ...cloneDeviceProfile(device), isSystem: false, updatedAt: Date.now() };
    set((state) => ({
      devices: [...state.devices.filter((item) => item.id !== custom.id), custom],
      currentDeviceId: custom.id,
    }));
  },

  updateDevice: (device) => {
    const existing = get().devices.find((item) => item.id === device.id);
    if (!existing || existing.isSystem) return false;
    const updated = { ...cloneDeviceProfile(device), isSystem: false, updatedAt: Date.now() };
    set((state) => ({
      devices: state.devices.map((item) => (item.id === updated.id ? updated : item)),
    }));
    return true;
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

  duplicateDevice: (id, name) => {
    const source = get().devices.find((device) => device.id === id);
    if (!source) return null;
    const copy = copyDeviceAsCustom(source, name ? { name } : {});
    set((state) => ({ devices: [...state.devices, copy], currentDeviceId: copy.id }));
    return copy;
  },

  replaceCustomDevices: (customDevices) =>
    set((state) => {
      const systems = state.devices.filter((device) => device.isSystem);
      const normalized = customDevices.map((device) => ({
        ...cloneDeviceProfile(device),
        isSystem: false,
      }));
      const devices = [...systems, ...normalized];
      return {
        devices,
        currentDeviceId: devices.some((device) => device.id === state.currentDeviceId)
          ? state.currentDeviceId
          : (devices[0]?.id ?? ''),
      };
    }),
}));

export function selectCurrentDevice(state: DeviceStoreState): DeviceProfile | undefined {
  return state.devices.find((device) => device.id === state.currentDeviceId);
}

export function serializeDeviceStore(state: DeviceStoreState): PersistedDeviceData {
  return {
    customDevices: state.devices.filter((device) => !device.isSystem).map(cloneDeviceProfile),
    favoriteIds: state.devices.filter((device) => device.favorite).map((device) => device.id),
    currentDeviceId: state.currentDeviceId,
  };
}
