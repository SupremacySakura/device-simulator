import type { CanvasPosition, CanvasTransform, CompareDeviceInstance } from '../types/compare';
import type { DeviceProfile } from '../types/device';
import { getInstanceBoundsOrFallback, type InstanceBounds } from './instance-size';

export const MIN_COMPARE_CANVAS_SCALE = 0.2;
export const MAX_COMPARE_CANVAS_SCALE = 2;

export interface CanvasBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CanvasViewportSize {
  width: number;
  height: number;
}

type DeviceProfileMap = Readonly<Record<string, DeviceProfile>>;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertViewportSize(viewportSize: CanvasViewportSize): void {
  if (
    !Number.isFinite(viewportSize.width) ||
    !Number.isFinite(viewportSize.height) ||
    viewportSize.width <= 0 ||
    viewportSize.height <= 0
  ) {
    throw new RangeError('viewportSize must contain finite dimensions greater than zero.');
  }
}

export function calculateInstancesBounds(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
): CanvasBounds | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;

  for (const instance of instances) {
    const profile = profiles[instance.deviceId];
    const bounds = getInstanceBoundsOrFallback(instance, profile);
    left = Math.min(left, bounds.left);
    top = Math.min(top, bounds.top);
    right = Math.max(right, bounds.right);
    bottom = Math.max(bottom, bounds.bottom);
  }

  if (!Number.isFinite(left)) return null;
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    top,
    right,
    bottom,
  };
}

/** Calculates a centered, clamped canvas transform that reveals every valid instance. */
export function calculateFitTransform(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
  viewportSize: CanvasViewportSize,
  padding: number,
): CanvasTransform {
  assertViewportSize(viewportSize);
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError('padding must be a finite, non-negative number.');
  }

  const bounds = calculateInstancesBounds(instances, profiles);
  if (!bounds) return { offsetX: 0, offsetY: 0, scale: 1 };

  const availableWidth = Math.max(0, viewportSize.width - padding * 2);
  const availableHeight = Math.max(0, viewportSize.height - padding * 2);
  const fitScale = Math.min(
    availableWidth / Math.max(bounds.width, 1),
    availableHeight / Math.max(bounds.height, 1),
  );
  const scale = clamp(fitScale, MIN_COMPARE_CANVAS_SCALE, MAX_COMPARE_CANVAS_SCALE);

  return {
    offsetX: (viewportSize.width - bounds.width * scale) / 2 - bounds.left * scale,
    offsetY: (viewportSize.height - bounds.height * scale) / 2 - bounds.top * scale,
    scale,
  };
}

export function normalizeBounds(start: CanvasPosition, end: CanvasPosition): CanvasBounds {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x);
  const bottom = Math.max(start.y, end.y);
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
    left,
    top,
    right,
    bottom,
  };
}

/** Treats touching edges as an intersection, matching pointer box-selection expectations. */
export function boundsIntersect(
  first: Pick<InstanceBounds, 'left' | 'top' | 'right' | 'bottom'>,
  second: Pick<InstanceBounds, 'left' | 'top' | 'right' | 'bottom'>,
): boolean {
  return (
    first.left <= second.right &&
    first.right >= second.left &&
    first.top <= second.bottom &&
    first.bottom >= second.top
  );
}
