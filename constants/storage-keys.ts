export const STORAGE_VERSION = 2;

export const STORAGE_KEYS = {
  devices: 'device-simulator:devices',
  settings: 'device-simulator:settings',
  simulator: 'device-simulator:simulator',
} as const;

export type StorageNamespace = keyof typeof STORAGE_KEYS;
export type StorageKey = (typeof STORAGE_KEYS)[StorageNamespace];
