import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, useSettingsStore } from '../stores/settings-store';

describe('settings store', () => {
  beforeEach(() => {
    useSettingsStore.getState().hydrate(null);
  });

  it('无持久化数据时回落到默认值', () => {
    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS);
  });

  it('记住独立工作台上次 URL', () => {
    useSettingsStore.getState().updateSettings({ lastStandaloneUrl: 'http://localhost:5173' });
    expect(useSettingsStore.getState().lastStandaloneUrl).toBe('http://localhost:5173');
  });

  it('hydrate 恢复已保存设置', () => {
    useSettingsStore.getState().hydrate({
      defaultScale: 1,
      zoomMode: 'manual',
      lastStandaloneUrl: 'https://example.com',
    });
    expect(useSettingsStore.getState()).toMatchObject({
      defaultScale: 1,
      zoomMode: 'manual',
      lastStandaloneUrl: 'https://example.com',
    });
  });
});
