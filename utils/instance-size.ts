import type { CompareDeviceInstance } from '../types/compare';
import type { DeviceOrientation, DeviceProfile } from '../types/device';
import { getDeviceFrameInsets, getDeviceViewport } from './device-profile';

export interface VisualSize {
  width: number;
  height: number;
}

export const MISSING_PROFILE_VISUAL_SIZE: Readonly<VisualSize> = {
  width: 280,
  height: 180,
};

export interface InstanceBounds extends VisualSize {
  x: number;
  y: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

function assertPositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero.`);
  }
}

/** Returns the unscaled outer device size, including the visible frame. */
export function getDeviceOuterSize(
  profile: DeviceProfile,
  orientation: DeviceOrientation,
  frameVisible = true,
): VisualSize {
  const viewport = getDeviceViewport(profile, orientation);
  const frameEnabled = frameVisible && profile.frame.enabled;
  if (!frameEnabled) return { width: viewport.width, height: viewport.height };

  const insets = getDeviceFrameInsets(profile, orientation);
  const { borderWidth } = profile.frame;
  return {
    width: viewport.width + insets.left + insets.right + borderWidth * 2,
    height: viewport.height + insets.top + insets.bottom + borderWidth * 2,
  };
}

/** Returns the device's visual canvas size after applying its instance scale. */
export function getInstanceVisualSize(
  instance: CompareDeviceInstance,
  profile: DeviceProfile,
): VisualSize {
  assertPositive(instance.scale, 'instance.scale');
  const outer = getDeviceOuterSize(profile, instance.orientation, instance.frameVisible);
  return {
    width: outer.width * instance.scale,
    height: outer.height * instance.scale,
  };
}

export function getInstanceVisualSizeOrFallback(
  instance: CompareDeviceInstance,
  profile: DeviceProfile | undefined,
): VisualSize {
  return profile ? getInstanceVisualSize(instance, profile) : MISSING_PROFILE_VISUAL_SIZE;
}

function createBounds(instance: CompareDeviceInstance, size: VisualSize): InstanceBounds {
  if (!Number.isFinite(instance.position.x) || !Number.isFinite(instance.position.y)) {
    throw new RangeError('instance.position must contain finite coordinates.');
  }
  const right = instance.position.x + size.width;
  const bottom = instance.position.y + size.height;
  return {
    x: instance.position.x,
    y: instance.position.y,
    left: instance.position.x,
    top: instance.position.y,
    right,
    bottom,
    centerX: instance.position.x + size.width / 2,
    centerY: instance.position.y + size.height / 2,
    ...size,
  };
}

/** Returns the visual bounds in canvas coordinates, excluding canvas zoom. */
export function getInstanceBounds(
  instance: CompareDeviceInstance,
  profile: DeviceProfile,
): InstanceBounds {
  return createBounds(instance, getInstanceVisualSize(instance, profile));
}

export function getInstanceBoundsOrFallback(
  instance: CompareDeviceInstance,
  profile: DeviceProfile | undefined,
): InstanceBounds {
  return createBounds(instance, getInstanceVisualSizeOrFallback(instance, profile));
}
