import type { CameraPosition, DeviceCamera, DeviceViewportConfig } from '../types/device';

export interface ResolvedCameraPosition {
  x: number;
  y: number;
}

export interface CameraBounds extends ResolvedCameraPosition {
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface CameraOverflow {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

function requireFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${field} must be a finite number.`);
  }
}

function validateDimensions(camera: DeviceCamera, viewport: DeviceViewportConfig): void {
  requireFiniteNumber(camera.width, 'camera.width');
  requireFiniteNumber(camera.height, 'camera.height');
  requireFiniteNumber(viewport.width, 'viewport.width');
  requireFiniteNumber(viewport.height, 'viewport.height');

  if (camera.width <= 0 || camera.height <= 0) {
    throw new RangeError('Camera width and height must be greater than zero.');
  }

  if (viewport.width <= 0 || viewport.height <= 0) {
    throw new RangeError('Viewport width and height must be greater than zero.');
  }
}

/**
 * Resolves a camera position in DeviceScreen CSS pixels. The origin is always
 * the top-left corner of DeviceScreen, never the outer device frame.
 */
export function resolveCameraPosition(
  camera: DeviceCamera,
  viewport: DeviceViewportConfig,
): ResolvedCameraPosition {
  validateDimensions(camera, viewport);

  if (camera.position.mode === 'absolute') {
    requireFiniteNumber(camera.position.x, 'camera.position.x');
    requireFiniteNumber(camera.position.y, 'camera.position.y');

    return {
      x: camera.position.x,
      y: camera.position.y,
    };
  }

  const { horizontal, vertical, offsetX, offsetY } = camera.position;
  requireFiniteNumber(offsetX, 'camera.position.offsetX');
  requireFiniteNumber(offsetY, 'camera.position.offsetY');

  let x: number;
  switch (horizontal) {
    case 'left':
      x = offsetX;
      break;
    case 'center':
      x = viewport.width / 2 - camera.width / 2 + offsetX;
      break;
    case 'right':
      x = viewport.width - camera.width - offsetX;
      break;
  }

  let y: number;
  switch (vertical) {
    case 'top':
      y = offsetY;
      break;
    case 'center':
      y = viewport.height / 2 - camera.height / 2 + offsetY;
      break;
    case 'bottom':
      y = viewport.height - camera.height - offsetY;
      break;
  }

  requireFiniteNumber(x, 'resolved camera x');
  requireFiniteNumber(y, 'resolved camera y');

  return { x, y };
}

export function getCameraBounds(
  camera: DeviceCamera,
  viewport: DeviceViewportConfig,
): CameraBounds {
  const position = resolveCameraPosition(camera, viewport);

  return {
    ...position,
    width: camera.width,
    height: camera.height,
    right: position.x + camera.width,
    bottom: position.y + camera.height,
  };
}

/** Returns overflow distances without clamping the user's configuration. */
export function getCameraOverflow(
  camera: DeviceCamera,
  viewport: DeviceViewportConfig,
): CameraOverflow {
  const bounds = getCameraBounds(camera, viewport);

  return {
    top: Math.max(0, -bounds.y),
    right: Math.max(0, bounds.right - viewport.width),
    bottom: Math.max(0, bounds.bottom - viewport.height),
    left: Math.max(0, -bounds.x),
  };
}

export function isCameraOutsideViewport(
  camera: DeviceCamera,
  viewport: DeviceViewportConfig,
): boolean {
  const overflow = getCameraOverflow(camera, viewport);

  return Object.values(overflow).some((distance) => distance > 0);
}

/**
 * Applies a drag delta while preserving anchor mode. Right and bottom anchor
 * offsets use the opposite sign because positive offsets point inward.
 */
export function moveCameraPosition(
  position: CameraPosition,
  deltaX: number,
  deltaY: number,
): CameraPosition {
  requireFiniteNumber(deltaX, 'deltaX');
  requireFiniteNumber(deltaY, 'deltaY');

  if (position.mode === 'absolute') {
    requireFiniteNumber(position.x, 'position.x');
    requireFiniteNumber(position.y, 'position.y');
    return {
      mode: 'absolute',
      x: position.x + deltaX,
      y: position.y + deltaY,
    };
  }

  requireFiniteNumber(position.offsetX, 'position.offsetX');
  requireFiniteNumber(position.offsetY, 'position.offsetY');
  return {
    ...position,
    offsetX:
      position.horizontal === 'right' ? position.offsetX - deltaX : position.offsetX + deltaX,
    offsetY: position.vertical === 'bottom' ? position.offsetY - deltaY : position.offsetY + deltaY,
  };
}
