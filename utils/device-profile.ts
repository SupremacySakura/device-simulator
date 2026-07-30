import type {
  CameraPosition,
  DeviceCamera,
  DeviceConfidence,
  DeviceFeatureStyle,
  DeviceFrameConfig,
  DeviceFrameInsets,
  DeviceOrientation,
  DeviceProfile,
  DeviceViewportConfig,
  DisplayFeature,
} from '../types/device';
import { createId } from './id';

export interface CopyDeviceOptions {
  id?: string;
  name?: string;
  now?: number;
  favorite?: boolean;
  idFactory?: () => string;
}

function cloneStyle(style: DeviceFeatureStyle): DeviceFeatureStyle {
  return { ...style };
}

function cloneCameraPosition(position: CameraPosition): CameraPosition {
  return { ...position };
}

function cloneCamera(camera: DeviceCamera): DeviceCamera {
  return {
    ...camera,
    position: cloneCameraPosition(camera.position),
    ...(camera.style === undefined ? {} : { style: cloneStyle(camera.style) }),
  };
}

function cloneDisplayFeature(feature: DisplayFeature): DisplayFeature {
  return {
    ...feature,
    ...(feature.style === undefined ? {} : { style: cloneStyle(feature.style) }),
  };
}

export function cloneViewportConfig(viewport: DeviceViewportConfig): DeviceViewportConfig {
  return {
    ...viewport,
    safeArea: { ...viewport.safeArea },
    cameras: viewport.cameras.map(cloneCamera),
    displayFeatures: viewport.displayFeatures.map(cloneDisplayFeature),
  };
}

export function cloneFrameConfig(frame: DeviceFrameConfig): DeviceFrameConfig {
  return {
    ...frame,
    insets: { ...frame.insets },
  };
}

export function cloneDeviceProfile(profile: DeviceProfile): DeviceProfile {
  return {
    ...profile,
    portrait: cloneViewportConfig(profile.portrait),
    landscape: cloneViewportConfig(profile.landscape),
    frame: cloneFrameConfig(profile.frame),
    tags: [...profile.tags],
  };
}

/** Reads the independently stored viewport for the requested orientation. */
export function getDeviceViewport(
  profile: DeviceProfile,
  orientation: DeviceOrientation,
): DeviceViewportConfig {
  return orientation === 'portrait' ? profile.portrait : profile.landscape;
}

/** Rotates portrait-oriented physical housing insets counterclockwise with the device. */
export function getDeviceFrameInsets(
  profile: DeviceProfile,
  orientation: DeviceOrientation,
): DeviceFrameInsets {
  const { insets } = profile.frame;
  if (orientation === 'portrait' || profile.category === 'desktop') return insets;

  return {
    top: insets.right,
    right: insets.bottom,
    bottom: insets.left,
    left: insets.top,
  };
}

export const getViewportForOrientation = getDeviceViewport;

export function getDeviceConfidence(profile: DeviceProfile): DeviceConfidence {
  return profile.confidence ?? 'unverified';
}

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

  const nextName = options.name?.trim() || `${source.name} 副本`;
  const copy = cloneDeviceProfile(source);

  return {
    ...copy,
    id: nextId,
    name: nextName,
    isSystem: false,
    confidence: 'unverified',
    favorite: options.favorite ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

export const duplicateAsCustomDevice = copyDeviceAsCustom;
