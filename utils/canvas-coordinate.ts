import type { CanvasPosition, CanvasTransform } from '../types/compare';

type CanvasViewportRect = Pick<DOMRect, 'left' | 'top'>;

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

function assertPoint(point: CanvasPosition, name: string): void {
  assertFinite(point.x, `${name}.x`);
  assertFinite(point.y, `${name}.y`);
}

function assertTransform(transform: CanvasTransform): void {
  assertFinite(transform.offsetX, 'transform.offsetX');
  assertFinite(transform.offsetY, 'transform.offsetY');
  if (!Number.isFinite(transform.scale) || transform.scale <= 0) {
    throw new RangeError('transform.scale must be a finite number greater than zero.');
  }
}

function assertViewportRect(viewportRect: CanvasViewportRect): void {
  assertFinite(viewportRect.left, 'viewportRect.left');
  assertFinite(viewportRect.top, 'viewportRect.top');
}

/** Converts a pointer position in client coordinates into infinite-canvas coordinates. */
export function screenToCanvasPoint(
  screenPoint: CanvasPosition,
  transform: CanvasTransform,
  viewportRect: CanvasViewportRect,
): CanvasPosition {
  assertPoint(screenPoint, 'screenPoint');
  assertTransform(transform);
  assertViewportRect(viewportRect);

  return {
    x: (screenPoint.x - viewportRect.left - transform.offsetX) / transform.scale,
    y: (screenPoint.y - viewportRect.top - transform.offsetY) / transform.scale,
  };
}

/** Converts an infinite-canvas position into client coordinates. */
export function canvasToScreenPoint(
  canvasPoint: CanvasPosition,
  transform: CanvasTransform,
  viewportRect: CanvasViewportRect,
): CanvasPosition {
  assertPoint(canvasPoint, 'canvasPoint');
  assertTransform(transform);
  assertViewportRect(viewportRect);

  return {
    x: viewportRect.left + transform.offsetX + canvasPoint.x * transform.scale,
    y: viewportRect.top + transform.offsetY + canvasPoint.y * transform.scale,
  };
}

/**
 * Changes the canvas scale while keeping the canvas point under `screenPoint`
 * fixed on screen. Scale clamping belongs to the caller because different
 * workspaces intentionally use different limits.
 */
export function calculateZoomedTransform(
  transform: CanvasTransform,
  nextScale: number,
  screenPoint: CanvasPosition,
  viewportRect: CanvasViewportRect,
): CanvasTransform {
  assertTransform(transform);
  if (!Number.isFinite(nextScale) || nextScale <= 0) {
    throw new RangeError('nextScale must be a finite number greater than zero.');
  }

  const anchor = screenToCanvasPoint(screenPoint, transform, viewportRect);
  return {
    offsetX: screenPoint.x - viewportRect.left - anchor.x * nextScale,
    offsetY: screenPoint.y - viewportRect.top - anchor.y * nextScale,
    scale: nextScale,
  };
}
