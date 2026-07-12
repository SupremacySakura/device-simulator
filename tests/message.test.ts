import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import { isExtensionMessage } from '../utils/message';

describe('extension message validation', () => {
  it('accepts parameterless ping messages', () => {
    expect(isExtensionMessage({ type: 'PING' })).toBe(true);
  });

  it('rejects malformed safe-area payloads', () => {
    expect(
      isExtensionMessage({
        type: 'SET_SAFE_AREA',
        payload: { top: 10, right: 0, bottom: -1, left: 0 },
      }),
    ).toBe(false);
  });

  it('accepts a fully validated device context', () => {
    expect(
      isExtensionMessage({
        type: 'SET_DEVICE_CONTEXT',
        payload: { device: SYSTEM_DEVICES[0], orientation: 'portrait' },
      }),
    ).toBe(true);
  });

  it('rejects unknown message types and non-string open payloads', () => {
    expect(isExtensionMessage({ type: 'UNKNOWN' })).toBe(false);
    expect(isExtensionMessage({ type: 'OPEN_SIMULATOR', payload: { url: 42 } })).toBe(false);
  });

  it.each(['', 'javascript:alert(1)', 'data:text/html,bad', 'blob:https://example.com/id'])(
    'rejects an unsafe simulator launch URL: %s',
    (url) => {
      expect(isExtensionMessage({ type: 'OPEN_SIMULATOR', payload: { url } })).toBe(false);
    },
  );

  it('accepts a normalizable HTTP(S) simulator launch URL', () => {
    expect(isExtensionMessage({ type: 'OPEN_SIMULATOR', payload: { url: 'localhost:4173' } })).toBe(
      true,
    );
  });
});
