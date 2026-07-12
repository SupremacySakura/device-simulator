export function createId(): string {
  if (
    typeof globalThis.crypto === 'undefined' ||
    typeof globalThis.crypto.randomUUID !== 'function'
  ) {
    throw new Error('crypto.randomUUID() is unavailable in this environment.');
  }

  return globalThis.crypto.randomUUID();
}

export function createPrefixedId(prefix: string): string {
  const normalizedPrefix = prefix.trim().replace(/[^a-z\d_-]+/gi, '-');

  if (normalizedPrefix.length === 0) {
    throw new Error('An ID prefix cannot be empty.');
  }

  return `${normalizedPrefix}-${createId()}`;
}

export const generateId = createId;
