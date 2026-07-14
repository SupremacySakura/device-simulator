import { describe, expect, it } from 'vitest';
import {
  calculateZoomedTransform,
  canvasToScreenPoint,
  screenToCanvasPoint,
} from '../utils/canvas-coordinate';

const VIEWPORT = { left: 100, top: 50 } as DOMRect;

describe('compare canvas coordinates', () => {
  it('converts between client and canvas coordinates in both directions', () => {
    const transform = { offsetX: 20, offsetY: -10, scale: 2 };
    const canvasPoint = { x: 30, y: 40 };
    const screenPoint = canvasToScreenPoint(canvasPoint, transform, VIEWPORT);

    expect(screenPoint).toEqual({ x: 180, y: 120 });
    expect(screenToCanvasPoint(screenPoint, transform, VIEWPORT)).toEqual(canvasPoint);
  });

  it('keeps the world point under the pointer fixed while zooming', () => {
    const pointer = { x: 340, y: 230 };
    const current = { offsetX: 40, offsetY: -20, scale: 1 };
    const anchor = screenToCanvasPoint(pointer, current, VIEWPORT);
    const next = calculateZoomedTransform(current, 2, pointer, VIEWPORT);

    expect(next).toEqual({ offsetX: -160, offsetY: -220, scale: 2 });
    expect(canvasToScreenPoint(anchor, next, VIEWPORT)).toEqual(pointer);
  });

  it('rejects invalid transforms and points', () => {
    expect(() =>
      screenToCanvasPoint({ x: 0, y: 0 }, { offsetX: 0, offsetY: 0, scale: 0 }, VIEWPORT),
    ).toThrow(RangeError);
    expect(() =>
      calculateZoomedTransform(
        { offsetX: 0, offsetY: 0, scale: 1 },
        Number.NaN,
        { x: 0, y: 0 },
        VIEWPORT,
      ),
    ).toThrow(RangeError);
  });
});
