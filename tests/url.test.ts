import { describe, expect, it } from 'vitest';
import {
  InvalidSimulatorUrlError,
  isValidSimulatorUrl,
  normalizeUrl,
  tryNormalizeUrl,
} from '../utils/url';

describe('normalizeUrl', () => {
  it.each([
    ['localhost:3000/shop?preview=1#hero', 'http://localhost:3000/shop?preview=1#hero'],
    ['127.0.0.1:5173', 'http://127.0.0.1:5173/'],
    ['example.com/docs#intro', 'https://example.com/docs#intro'],
    ['  https://example.com/path?q=1  ', 'https://example.com/path?q=1'],
    ['http://example.com', 'http://example.com/'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///tmp/index.html',
    'chrome://settings',
  ])('rejects the unsupported scheme in %s', (input) => {
    expect(() => normalizeUrl(input)).toThrow(InvalidSimulatorUrlError);
    expect(isValidSimulatorUrl(input)).toBe(false);
  });

  it('rejects blank and malformed URLs with a typed failure result', () => {
    expect(() => normalizeUrl('   ')).toThrow('请输入要加载的 URL');

    const result = tryNormalizeUrl('https://');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('URL');
    }
  });
});
