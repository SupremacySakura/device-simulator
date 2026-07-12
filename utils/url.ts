const HTTP_PROTOCOL = 'http:';
const HTTPS_PROTOCOL = 'https:';

export class InvalidSimulatorUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSimulatorUrlError';
  }
}

export type UrlNormalizationResult =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      error: string;
    };

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized === '::1' ||
    normalized === '[::1]' ||
    normalized === '0.0.0.0' ||
    normalized.startsWith('127.')
  );
}

function hasHttpProtocol(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hasUnsupportedExplicitScheme(value: string): boolean {
  const match = /^([a-z][a-z\d+.-]*):(.*)$/i.exec(value);
  if (match === null) {
    return false;
  }

  const scheme = match[1];
  const rest = match[2];
  if (scheme === undefined || rest === undefined) {
    return false;
  }
  if (scheme.toLowerCase() === 'http' || scheme.toLowerCase() === 'https') {
    return !rest.startsWith('//');
  }

  // A numeric suffix is a port, for example localhost:3000.
  return !/^\d+(?:[/?#]|$)/.test(rest);
}

function assertUsableHttpUrl(url: URL): void {
  if (url.protocol !== HTTP_PROTOCOL && url.protocol !== HTTPS_PROTOCOL) {
    throw new InvalidSimulatorUrlError('仅支持 http:// 或 https:// URL。');
  }

  if (url.hostname.length === 0 || url.hostname === '.') {
    throw new InvalidSimulatorUrlError('URL 缺少有效的主机名。');
  }
}

/**
 * Normalizes a user-entered URL. Local loopback hosts default to HTTP; other
 * hosts default to HTTPS. An explicitly supplied HTTP/HTTPS protocol is kept.
 */
export function normalizeUrl(input: string): string {
  const value = input.trim();

  if (value.length === 0) {
    throw new InvalidSimulatorUrlError('请输入要加载的 URL。');
  }

  if (hasUnsupportedExplicitScheme(value)) {
    throw new InvalidSimulatorUrlError('仅支持 http:// 或 https:// URL。');
  }

  try {
    if (hasHttpProtocol(value)) {
      const explicitUrl = new URL(value);
      assertUsableHttpUrl(explicitUrl);
      return explicitUrl.href;
    }

    const schemelessValue = value.startsWith('//') ? value.slice(2) : value;
    const parsed = new URL(`https://${schemelessValue}`);
    assertUsableHttpUrl(parsed);

    if (isLoopbackHostname(parsed.hostname)) {
      parsed.protocol = HTTP_PROTOCOL;
    }

    return parsed.href;
  } catch (error: unknown) {
    if (error instanceof InvalidSimulatorUrlError) {
      throw error;
    }

    throw new InvalidSimulatorUrlError('URL 格式无效，请检查后重试。');
  }
}

export function tryNormalizeUrl(input: string): UrlNormalizationResult {
  try {
    return {
      success: true,
      url: normalizeUrl(input),
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'URL 格式无效，请检查后重试。',
    };
  }
}

export function isValidSimulatorUrl(input: string): boolean {
  return tryNormalizeUrl(input).success;
}
