import { clampManualScale } from './device-scale';

export interface CanvasPoint {
  x: number;
  y: number;
}

export const WHEEL_ZOOM_SENSITIVITY = 0.0015;

function assertFinitePoint(point: CanvasPoint, name: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${name} must contain finite coordinates.`);
  }
}

export function calculateZoomedPan(
  pan: CanvasPoint,
  focus: CanvasPoint,
  currentScale: number,
  nextScale: number,
): CanvasPoint {
  assertFinitePoint(pan, 'pan');
  assertFinitePoint(focus, 'focus');
  if (!Number.isFinite(currentScale) || currentScale <= 0) {
    throw new RangeError('currentScale must be a finite number greater than zero.');
  }
  if (!Number.isFinite(nextScale) || nextScale <= 0) {
    throw new RangeError('nextScale must be a finite number greater than zero.');
  }

  const ratio = nextScale / currentScale;
  return {
    x: focus.x - (focus.x - pan.x) * ratio,
    y: focus.y - (focus.y - pan.y) * ratio,
  };
}

export function calculateDraggedPan(
  origin: CanvasPoint,
  pointerStart: CanvasPoint,
  pointerCurrent: CanvasPoint,
): CanvasPoint {
  assertFinitePoint(origin, 'origin');
  assertFinitePoint(pointerStart, 'pointerStart');
  assertFinitePoint(pointerCurrent, 'pointerCurrent');
  return {
    x: origin.x + pointerCurrent.x - pointerStart.x,
    y: origin.y + pointerCurrent.y - pointerStart.y,
  };
}

export function calculateWheelZoomScale(
  currentScale: number,
  deltaY: number,
  sensitivity = WHEEL_ZOOM_SENSITIVITY,
): number {
  if (!Number.isFinite(deltaY)) throw new RangeError('deltaY must be finite.');
  if (!Number.isFinite(sensitivity) || sensitivity <= 0) {
    throw new RangeError('sensitivity must be a finite number greater than zero.');
  }
  const nextScale = currentScale * Math.exp(-deltaY * sensitivity);
  return Math.round(clampManualScale(nextScale) * 1000) / 1000;
}
