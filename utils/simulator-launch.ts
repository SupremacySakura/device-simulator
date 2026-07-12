import { normalizeUrl } from './url';

export interface SimulatorLaunchQueryOptions {
  url?: string;
  deviceId?: string;
  blank?: boolean;
  embedded?: boolean;
  sessionId?: string;
}

export function buildSimulatorSearch(options: SimulatorLaunchQueryOptions = {}): string {
  const query = new URLSearchParams();
  if (options.url !== undefined) query.set('url', normalizeUrl(options.url));
  if (options.deviceId) query.set('device', options.deviceId);
  if (options.blank) query.set('blank', '1');
  if (options.embedded) query.set('embedded', '1');
  if (options.sessionId) query.set('session', options.sessionId);
  return query.toString();
}
