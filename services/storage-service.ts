import { browser } from 'wxt/browser';
import type { PersistedState } from '../types/storage';

const memoryFallback = new Map<string, unknown>();

function hasExtensionStorage(): boolean {
  try {
    return Boolean(browser.storage?.local);
  } catch {
    return false;
  }
}

function isPersistedState<T>(value: unknown, version: number): value is PersistedState<T> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { version?: unknown; data?: unknown };
  return candidate.version === version && 'data' in candidate;
}

export const storageService = {
  async read<T>(key: string, version: number): Promise<T | null> {
    try {
      const raw = hasExtensionStorage()
        ? (await browser.storage.local.get(key))[key]
        : memoryFallback.get(key);
      return isPersistedState<T>(raw, version) ? raw.data : null;
    } catch (error) {
      console.warn(`[storage] Unable to read ${key}`, error);
      const fallback = memoryFallback.get(key);
      return isPersistedState<T>(fallback, version) ? fallback.data : null;
    }
  },

  async write<T>(key: string, version: number, data: T): Promise<void> {
    const value: PersistedState<T> = { version, data };
    memoryFallback.set(key, value);
    if (!hasExtensionStorage()) return;
    try {
      await browser.storage.local.set({ [key]: value });
    } catch (error) {
      console.warn(`[storage] Unable to persist ${key}`, error);
      throw new Error('无法保存本地配置，请检查扩展存储权限。', { cause: error });
    }
  },

  async remove(key: string): Promise<void> {
    memoryFallback.delete(key);
    if (!hasExtensionStorage()) return;
    await browser.storage.local.remove(key);
  },

  async clear(keys: readonly string[]): Promise<void> {
    for (const key of keys) memoryFallback.delete(key);
    if (!hasExtensionStorage()) return;
    await browser.storage.local.remove([...keys]);
  },
};
