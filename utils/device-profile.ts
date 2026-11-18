import type { DeviceOrientation, DeviceProfile, DeviceViewport } from '../types/device';
import { createId } from './id';

export interface CopyDeviceOptions {
  id?: string;
  name?: string;
  now?: number;
  idFactory?: () => string;
}

export function cloneViewport(viewport: DeviceViewport): DeviceViewport {
  return { ...viewport, safeArea: { ...viewport.safeArea } };
}

export function cloneDeviceProfile(profile: DeviceProfile): DeviceProfile {
  return {
    ...profile,
    portrait: cloneViewport(profile.portrait),
    landscape: cloneViewport(profile.landscape),
  };
}

/** Reads the independently stored viewport for the requested orientation. */
export function getDeviceViewport(
  profile: DeviceProfile,
  orientation: DeviceOrientation,
): DeviceViewport {
  return orientation === 'portrait' ? profile.portrait : profile.landscape;
}

export const getViewportForOrientation = getDeviceViewport;

/** Creates a deeply independent, editable custom-device copy. */
export function copyDeviceAsCustom(
  source: DeviceProfile,
  options: CopyDeviceOptions = {},
): DeviceProfile {
  const now = options.now ?? Date.now();
  if (!Number.isFinite(now) || now < 0) {
    throw new RangeError('now must be a finite, non-negative timestamp.');
  }

  const nextId = options.id ?? (options.idFactory ?? createId)();
  if (nextId.trim().length === 0) {
    throw new Error('A copied device must have a non-empty ID.');
  }
  if (nextId === source.id) {
    throw new Error('A copied device must use a new ID.');
  }

  const copy = cloneDeviceProfile(source);
  return {
    ...copy,
    id: nextId,
    name: options.name?.trim() || `${source.name} 副本`,
    isSystem: false,
    createdAt: now,
    updatedAt: now,
  };
}

export const duplicateAsCustomDevice = copyDeviceAsCustom;
