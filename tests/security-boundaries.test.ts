import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants/default-settings';
import {
  sanitizeHistoryData,
  useHistoryStore,
  type PersistedHistoryData,
} from '../stores/history-store';
import { useSettingsStore } from '../stores/settings-store';
import { parseEmbeddedSimulatorContext } from '../utils/embedded-context';
import { buildSimulatorSearch } from '../utils/simulator-launch';

afterEach(() => {
  useHistoryStore.getState().clearAll();
  useSettingsStore.getState().resetSettings();
});

describe('settings reset safety', () => {
  it('keeps runtime hydration and actions because Zustand shallow-merges reset values', () => {
    useSettingsStore.getState().hydrate({
      ...DEFAULT_SETTINGS,
      showGrid: true,
      showShadow: false,
    });

    useSettingsStore.getState().resetSettings();
    const state = useSettingsStore.getState();

    expect(state.showGrid).toBe(DEFAULT_SETTINGS.showGrid);
    expect(state.showShadow).toBe(DEFAULT_SETTINGS.showShadow);
    expect(state.hydrated).toBe(true);
    expect(state.updateSettings).toBeTypeOf('function');
    expect(state.resetSettings).toBeTypeOf('function');

    state.updateSettings({ showGrid: true });
    expect(useSettingsStore.getState().showGrid).toBe(true);
  });
});

describe('history URL boundaries', () => {
  it('rejects unsafe URLs and stores canonical HTTP(S) URLs only', () => {
    const history = useHistoryStore.getState();
    history.hydrate(null);
    history.recordUrl('');
    history.recordUrl('javascript:alert(1)');
    history.recordUrl('data:text/html,hello');
    history.recordUrl('blob:https://example.com/id');
    history.recordUrl('example.com', '  Example  ');
    history.recordUrl('https://example.com/', 'Latest');
    history.recordCombination('file:///tmp/page.html', 'iphone-15-pro');
    history.recordCombination('localhost:3000', 'iphone-15-pro');

    const state = useHistoryStore.getState();
    expect(state.recentUrls).toEqual([
      expect.objectContaining({ url: 'https://example.com/', title: 'Latest' }),
    ]);
    expect(state.combinations).toEqual([
      expect.objectContaining({ url: 'http://localhost:3000/', deviceId: 'iphone-15-pro' }),
    ]);
  });

  it('sanitizes tampered persisted history, timestamps, titles and duplicates', () => {
    const value = {
      recentUrls: [
        { url: 'example.com', title: 'Example', visitedAt: 3 },
        { url: 'https://example.com/', title: 'Duplicate', visitedAt: 2 },
        { url: 'javascript:alert(1)', visitedAt: 1 },
        { url: 'https://safe.test/', title: { unsafe: true }, visitedAt: 1 },
        { url: 'https://nan.test/', visitedAt: Number.NaN },
      ],
      recentDeviceIds: ['iphone-15-pro', '', 'iphone-15-pro'],
      combinations: [
        { url: 'localhost:5173', deviceId: 'pixel-8', usedAt: 4 },
        { url: 'data:text/html,bad', deviceId: 'pixel-8', usedAt: 3 },
        { url: 'https://safe.test/', deviceId: 'pixel-8', usedAt: Number.POSITIVE_INFINITY },
      ],
    };

    expect(sanitizeHistoryData(value)).toEqual({
      recentUrls: [{ url: 'https://example.com/', title: 'Example', visitedAt: 3 }],
      recentDeviceIds: ['iphone-15-pro'],
      combinations: [{ url: 'http://localhost:5173/', deviceId: 'pixel-8', usedAt: 4 }],
    });

    useHistoryStore.getState().hydrate(value as unknown as PersistedHistoryData);
    expect(useHistoryStore.getState().recentUrls).toHaveLength(1);
  });
});

describe('simulator launch URL boundary', () => {
  it('normalizes valid URLs before building a launch query', () => {
    const params = new URLSearchParams(
      buildSimulatorSearch({
        url: 'localhost:4173/path',
        deviceId: 'iphone-15-pro',
        embedded: true,
        sessionId: '0123456789abcdef',
      }),
    );

    expect(params.get('url')).toBe('http://localhost:4173/path');
    expect(params.get('embedded')).toBe('1');
    expect(params.get('session')).toBe('0123456789abcdef');
  });

  it.each(['', 'javascript:alert(1)', 'data:text/html,bad', 'blob:https://example.com/id'])(
    'rejects %s before creating a simulator URL',
    (url) => {
      expect(() => buildSimulatorSearch({ url })).toThrow();
    },
  );
});

describe('embedded simulator context', () => {
  it('accepts only a canonical HTTP(S) parent origin and a strong session ID', () => {
    expect(
      parseEmbeddedSimulatorContext(
        '?embedded=1&parentOrigin=https%3A%2F%2Fexample.com&session=0123456789abcdef',
      ),
    ).toEqual({ parentOrigin: 'https://example.com', sessionId: '0123456789abcdef' });
  });

  it.each([
    '?embedded=1&parentOrigin=javascript%3Aalert(1)&session=0123456789abcdef',
    '?embedded=1&parentOrigin=https%3A%2F%2Fexample.com%2Fpath&session=0123456789abcdef',
    '?embedded=1&parentOrigin=https%3A%2F%2Fexample.com&session=short',
    '?parentOrigin=https%3A%2F%2Fexample.com&session=0123456789abcdef',
  ])('rejects an untrusted embedded context: %s', (search) => {
    expect(parseEmbeddedSimulatorContext(search)).toBeNull();
  });
});
