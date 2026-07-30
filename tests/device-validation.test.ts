import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import type { DeviceCamera, DeviceProfile, DisplayFeature } from '../types/device';
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

function firstFeature(device: DeviceProfile): DisplayFeature {
  const feature = device.portrait.displayFeatures[0];
  if (feature === undefined) {
    throw new Error('The fixture must contain a portrait display feature.');
  }
  return feature;
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

  it('rejects an unknown confidence value but accepts a missing legacy value', () => {
    const legacy = getDevice('iphone-15-pro');
    delete legacy.confidence;
    expect(validateDeviceProfile(legacy).success).toBe(true);

    const invalid = getDevice('iphone-15-pro');
    (invalid as unknown as { confidence: string }).confidence = 'trusted';
    const result = validateDeviceProfile(invalid);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected confidence validation to fail.');
    }
    expect(result.issues).toContainEqual(
      expect.objectContaining({ path: '$.confidence', code: 'enum' }),
    );
  });

  it.each([
    [
      'viewport width',
      (profile: DeviceProfile) => {
        profile.portrait.width = 4001;
      },
      '$.portrait.width',
    ],
    [
      'DPR',
      (profile: DeviceProfile) => {
        profile.devicePixelRatio = 5.1;
      },
      '$.devicePixelRatio',
    ],
    [
      'vertical safe area sum',
      (profile: DeviceProfile) => {
        profile.portrait.safeArea.top = 500;
        profile.portrait.safeArea.bottom = 500;
      },
      '$.portrait.safeArea',
    ],
    [
      'screen radius',
      (profile: DeviceProfile) => {
        profile.portrait.screenBorderRadius = 197;
      },
      '$.portrait.screenBorderRadius',
    ],
  ] as const)('rejects an out-of-range %s', (_label, mutate, path) => {
    const profile = getDevice('iphone-15-pro');
    mutate(profile);

    const result = validateDeviceProfile(profile);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected range validation to fail.');
    }
    expect(result.issues).toContainEqual(expect.objectContaining({ path }));
  });

  it.each([
    [
      'absolute camera',
      'iphone-15-pro',
      (profile: DeviceProfile) => {
        firstCamera(profile).position = { mode: 'absolute', x: -1, y: 0 };
      },
      '$.portrait.cameras[0]',
    ],
    [
      'anchored camera',
      'iphone-15-pro',
      (profile: DeviceProfile) => {
        firstCamera(profile).position = {
          mode: 'anchor',
          horizontal: 'right',
          vertical: 'top',
          offsetX: -1,
          offsetY: 0,
        };
      },
      '$.portrait.cameras[0]',
    ],
    [
      'display feature',
      'surface-duo-spanned',
      (profile: DeviceProfile) => {
        const feature = firstFeature(profile);
        feature.x = profile.portrait.width - 1;
      },
      '$.portrait.displayFeatures[0]',
    ],
  ] as const)('rejects an out-of-bounds %s', (_label, deviceId, mutate, path) => {
    const profile = getDevice(deviceId);
    mutate(profile);

    const result = validateDeviceProfile(profile);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected bounds validation to fail.');
    }
    expect(result.issues).toContainEqual(expect.objectContaining({ path, code: 'out_of_bounds' }));
  });
});
