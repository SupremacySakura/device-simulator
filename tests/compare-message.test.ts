import { describe, expect, it } from 'vitest';
import type { CompareBridgeIdentity, CompareRuntimeMessage } from '../types/compare-message';
import {
  calculateScrollPosition,
  createCompareIframeName,
  isCompareRuntimeMessage,
  isControlledComparePageUrl,
  parseCompareIframeName,
} from '../utils/compare-message';
import { calculateScrollProgress } from '../utils/scroll-progress';

const IDENTITY: CompareBridgeIdentity = {
  sessionId: 'session_12345678',
  instanceId: 'instance_12345678',
  bridgeToken: 'bridge_12345678',
};

function scrollMessage(
  overrides: Record<string, unknown> = {},
): CompareRuntimeMessage | Record<string, unknown> {
  return {
    source: 'device-simulator-compare',
    type: 'COMPARE_SCROLL_EVENT',
    payload: {
      ...IDENTITY,
      syncToken: 'sync_12345678',
      verticalProgress: 0.5,
      horizontalProgress: 0.25,
      ...overrides,
    },
  };
}

describe('compare iframe identity', () => {
  it('round-trips a strict iframe name', () => {
    const name = createCompareIframeName(IDENTITY);
    expect(parseCompareIframeName(name)).toEqual(IDENTITY);
  });

  it.each([
    '',
    'device-simulator-compare-v1:short:instance_12345678:bridge_12345678',
    'device-simulator-compare-v1:session_12345678:instance_12345678:bridge_12345678:extra',
    'foreign:session_12345678:instance_12345678:bridge_12345678',
  ])('rejects an invalid iframe name: %s', (name) => {
    expect(parseCompareIframeName(name)).toBeNull();
  });
});

describe('controlled compare URLs', () => {
  it.each([
    'http://localhost:3000/',
    'https://localhost/app',
    'http://shop.localhost:4173/',
    'http://127.0.0.1:8080/',
  ])('accepts an explicitly controlled local URL: %s', (url) => {
    expect(isControlledComparePageUrl(url)).toBe(true);
  });

  it.each([
    'https://example.com/',
    'https://localhost.example.com/',
    'http://127.0.0.2/',
    'javascript:alert(1)',
  ])('rejects an uncontrolled URL: %s', (url) => {
    expect(isControlledComparePageUrl(url)).toBe(false);
  });
});

describe('compare runtime message validation', () => {
  it('accepts a fully typed scroll event', () => {
    expect(isCompareRuntimeMessage(scrollMessage())).toBe(true);
  });

  it.each([
    { verticalProgress: -0.01 },
    { verticalProgress: 1.01 },
    { verticalProgress: Number.NaN },
    { horizontalProgress: Number.POSITIVE_INFINITY },
    { syncToken: 'short' },
  ])('rejects malformed scroll payload data: %o', (override) => {
    expect(isCompareRuntimeMessage(scrollMessage(override))).toBe(false);
  });

  it('rejects extra payload fields instead of silently trusting them', () => {
    expect(isCompareRuntimeMessage(scrollMessage({ privilegedAction: true }))).toBe(false);
  });

  it.each(['javascript:alert(1)', 'data:text/html,bad', 'https://'])(
    'rejects an unsafe navigation URL: %s',
    (url) => {
      expect(
        isCompareRuntimeMessage({
          source: 'device-simulator-compare',
          type: 'COMPARE_APPLY_NAVIGATION',
          payload: { ...IDENTITY, url },
        }),
      ).toBe(false);
    },
  );

  it('rejects the right payload with an untrusted source marker', () => {
    expect(isCompareRuntimeMessage({ ...scrollMessage(), source: 'untrusted-page' })).toBe(false);
  });
});

describe('scroll progress bridge', () => {
  it('calculates normalized horizontal and vertical progress', () => {
    expect(
      calculateScrollProgress({
        scrollTop: 750,
        scrollLeft: 300,
        scrollHeight: 2000,
        scrollWidth: 1600,
        viewportHeight: 500,
        viewportWidth: 1000,
      }),
    ).toEqual({ verticalProgress: 0.5, horizontalProgress: 0.5 });
  });

  it('maps the same progress to a different page size', () => {
    expect(
      calculateScrollPosition(
        { verticalProgress: 0.5, horizontalProgress: 0.25 },
        {
          scrollHeight: 3500,
          scrollWidth: 1800,
          viewportHeight: 500,
          viewportWidth: 1000,
        },
      ),
    ).toEqual({ top: 1500, left: 200 });
  });

  it('returns zero progress and position when the page cannot scroll', () => {
    expect(
      calculateScrollProgress({
        scrollTop: 0,
        scrollLeft: 0,
        scrollHeight: 500,
        scrollWidth: 300,
        viewportHeight: 800,
        viewportWidth: 400,
      }),
    ).toEqual({ verticalProgress: 0, horizontalProgress: 0 });
    expect(
      calculateScrollPosition(
        { verticalProgress: 1, horizontalProgress: 1 },
        {
          scrollHeight: 500,
          scrollWidth: 300,
          viewportHeight: 800,
          viewportWidth: 400,
        },
      ),
    ).toEqual({ top: 0, left: 0 });
  });

  it('rejects non-finite metrics and progress', () => {
    expect(() =>
      calculateScrollProgress({
        scrollTop: Number.NaN,
        scrollLeft: 0,
        scrollHeight: 1000,
        scrollWidth: 1000,
        viewportHeight: 500,
        viewportWidth: 500,
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateScrollPosition(
        { verticalProgress: Number.NaN, horizontalProgress: 0 },
        {
          scrollHeight: 1000,
          scrollWidth: 1000,
          viewportHeight: 500,
          viewportWidth: 500,
        },
      ),
    ).toThrow(RangeError);
  });
});
