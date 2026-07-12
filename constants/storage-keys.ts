export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  devices: 'device-simulator:devices',
  settings: 'device-simulator:settings',
  history: 'device-simulator:history',
  simulator: 'device-simulator:simulator',
} as const;

export const STORAGE_VERSIONS = {
  devices: STORAGE_VERSION,
  settings: STORAGE_VERSION,
  history: STORAGE_VERSION,
  simulator: STORAGE_VERSION,
} as const;

export type StorageNamespace = keyof typeof STORAGE_KEYS;
export type StorageKey = (typeof STORAGE_KEYS)[StorageNamespace];
