import { describe, expect, it } from 'vitest';
import type { DeviceCamera, DeviceViewportConfig } from '../types/device';
import {
  getCameraOverflow,
  moveCameraPosition,
  resolveCameraPosition,
} from '../utils/camera-position';

const viewport: DeviceViewportConfig = {
  width: 400,
  height: 800,
  screenBorderRadius: 40,
  safeArea: { top: 20, right: 0, bottom: 20, left: 0 },
  cameras: [],
  displayFeatures: [],
};

function cameraWithPosition(position: DeviceCamera['position']): DeviceCamera {
  return {
    id: 'camera',
    name: 'Camera',
    position,
    width: 100,
    height: 40,
    shape: 'rounded-rect',
    borderRadius: 20,
    rotation: 0,
    layoutMode: 'overlay',
    visible: true,
  };
}

describe('resolveCameraPosition', () => {
  it('returns absolute coordinates unchanged, including fractional values', () => {
    const camera = cameraWithPosition({ mode: 'absolute', x: 12.5, y: -3.25 });

    expect(resolveCameraPosition(camera, viewport)).toEqual({ x: 12.5, y: -3.25 });
    expect(getCameraOverflow(camera, viewport)).toEqual({
      top: 3.25,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  it.each([
    [
      'left/top',
      { mode: 'anchor', horizontal: 'left', vertical: 'top', offsetX: 10, offsetY: 12 },
      { x: 10, y: 12 },
    ],
    [
      'center/center',
      {
        mode: 'anchor',
        horizontal: 'center',
        vertical: 'center',
        offsetX: 5,
        offsetY: -10,
      },
      { x: 155, y: 370 },
    ],
    [
      'right/bottom',
      {
        mode: 'anchor',
        horizontal: 'right',
        vertical: 'bottom',
        offsetX: 20,
        offsetY: 30,
      },
      { x: 280, y: 730 },
    ],
  ] as const)('resolves the %s anchor', (_label, position, expected) => {
    expect(resolveCameraPosition(cameraWithPosition(position), viewport)).toEqual(expected);
  });

  it('rejects NaN rather than silently emitting invalid coordinates', () => {
    const camera = cameraWithPosition({
      mode: 'anchor',
      horizontal: 'center',
      vertical: 'top',
      offsetX: Number.NaN,
      offsetY: 10,
    });

    expect(() => resolveCameraPosition(camera, viewport)).toThrow(TypeError);
  });
});

describe('moveCameraPosition', () => {
  it('adds drag deltas to absolute positions', () => {
    expect(moveCameraPosition({ mode: 'absolute', x: 20, y: 30 }, 5, -8)).toEqual({
      mode: 'absolute',
      x: 25,
      y: 22,
    });
  });

  it('reverses deltas for right and bottom anchor offsets', () => {
    expect(
      moveCameraPosition(
        {
          mode: 'anchor',
          horizontal: 'right',
          vertical: 'bottom',
          offsetX: 20,
          offsetY: 30,
        },
        5,
        -8,
      ),
    ).toEqual({
      mode: 'anchor',
      horizontal: 'right',
      vertical: 'bottom',
      offsetX: 15,
      offsetY: 38,
    });
  });
});
