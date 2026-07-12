import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import type { DeviceCamera, DeviceProfile } from '../types/device';
import { cloneDeviceProfile } from '../utils/device-profile';
import { validateDeviceProfile } from '../utils/validation';

function getDevice(id: string): DeviceProfile {
  const device = SYSTEM_DEVICES.find((candidate) => candidate.id === id);
  if (device === undefined) {
    throw new Error(`Missing test device: ${id}`);
  }
  return cloneDeviceProfile(device);
}

function firstCamera(device: DeviceProfile): DeviceCamera {
  const camera = device.portrait.cameras[0];
  if (camera === undefined) {
    throw new Error('The fixture must contain a portrait camera.');
  }
  return camera;
}

describe('validateDeviceProfile', () => {
  it('accepts and sanitizes a complete valid device profile', () => {
    const profile = getDevice('iphone-15-pro');
    const result = validateDeviceProfile(profile);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected the fixture to be valid.');
    }

    expect(result.data).toEqual(profile);
    expect(result.data).not.toBe(profile);
    expect(result.data.portrait).not.toBe(profile.portrait);
  });

  it('reports field-level issues for invalid names, dimensions, DPR, insets, and NaN', () => {
    const profile = getDevice('iphone-15-pro');
    profile.name = '   ';
    profile.devicePixelRatio = 0;
    profile.portrait.width = 0;
    profile.landscape.safeArea.left = -1;
    firstCamera(profile).width = Number.NaN;

    const result = validateDeviceProfile(profile);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail.');
    }

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '$.name', code: 'required' }),
        expect.objectContaining({ path: '$.devicePixelRatio', code: 'range' }),
        expect.objectContaining({ path: '$.portrait.width', code: 'range' }),
        expect.objectContaining({ path: '$.landscape.safeArea.left', code: 'range' }),
        expect.objectContaining({ path: '$.portrait.cameras[0].width', code: 'type' }),
      ]),
    );
  });

  it('rejects duplicate camera IDs within one orientation', () => {
    const profile = getDevice('iphone-15-pro');
    const camera = firstCamera(profile);
    profile.portrait.cameras.push({
      ...camera,
      position: { ...camera.position },
      ...(camera.style === undefined ? {} : { style: { ...camera.style } }),
    });

    const result = validateDeviceProfile(profile);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected duplicate IDs to fail validation.');
    }
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: '$.portrait.cameras[1].id', code: 'duplicate' }),
    );
  });
});
