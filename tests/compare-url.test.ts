import { browser } from 'wxt/browser';
import { describe, expect, it, vi } from 'vitest';
import { isBundledCompareDemoUrl, normalizeCompareInstanceUrl } from '../utils/compare-url';

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://device-simulator-test${path}`,
    },
  },
}));

describe('compare URL boundaries', () => {
  it('accepts only the bundled extension demo path while preserving query and hash', () => {
    const demoUrl = `${browser.runtime.getURL('/demo.html')}?fixture=1#section`;

    expect(isBundledCompareDemoUrl(demoUrl)).toBe(true);
    expect(normalizeCompareInstanceUrl(demoUrl)).toBe(new URL(demoUrl).href);
    expect(isBundledCompareDemoUrl(browser.runtime.getURL('/simulator.html'))).toBe(false);
  });

  it('rejects a different extension host even when the path is also demo.html', () => {
    const ownDemo = new URL(browser.runtime.getURL('/demo.html'));
    const foreignDemo = `${ownDemo.protocol}//foreign-extension-id${ownDemo.pathname}`;

    expect(isBundledCompareDemoUrl(foreignDemo)).toBe(false);
    expect(normalizeCompareInstanceUrl(foreignDemo)).toBeNull();
  });

  it('rejects credentials embedded in an otherwise matching extension URL', () => {
    const ownDemo = new URL(browser.runtime.getURL('/demo.html'));
    const credentialedDemo = `${ownDemo.protocol}//user:password@${ownDemo.host}${ownDemo.pathname}`;

    expect(isBundledCompareDemoUrl(credentialedDemo)).toBe(false);
    expect(normalizeCompareInstanceUrl(credentialedDemo)).toBeNull();
  });
});
