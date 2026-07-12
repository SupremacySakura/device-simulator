export interface EmbeddedSimulatorContext {
  parentOrigin: string;
  sessionId: string;
}

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{16,128}$/;

export function parseEmbeddedSimulatorContext(search: string): EmbeddedSimulatorContext | null {
  const params = new URLSearchParams(search);
  if (params.get('embedded') !== '1') return null;

  const parentOrigin = params.get('parentOrigin');
  const sessionId = params.get('session');
  if (!parentOrigin || !sessionId || !SESSION_ID_PATTERN.test(sessionId)) return null;

  try {
    const parsed = new URL(parentOrigin);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.origin !== parentOrigin
    ) {
      return null;
    }
    return { parentOrigin, sessionId };
  } catch {
    return null;
  }
}
