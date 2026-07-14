import { browser } from 'wxt/browser';
import { tryNormalizeUrl } from './url';

export function isBundledCompareDemoUrl(value: string): boolean {
  try {
    const candidate = new URL(value);
    const demo = new URL(browser.runtime.getURL('/demo.html'));
    return (
      candidate.protocol === demo.protocol &&
      candidate.username === demo.username &&
      candidate.password === demo.password &&
      candidate.host === demo.host &&
      candidate.pathname === demo.pathname
    );
  } catch {
    return false;
  }
}

/**
 * Compare instances may render the bundled offline demo in addition to normal
 * HTTP(S) pages. No other extension URL is accepted from persisted data.
 */
export function normalizeCompareInstanceUrl(value: string): string | null {
  if (value.length === 0) return '';

  if (isBundledCompareDemoUrl(value)) return new URL(value).href;

  const result = tryNormalizeUrl(value);
  return result.success ? result.url : null;
}
