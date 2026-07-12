import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import type { DeviceCamera, DeviceProfile, DisplayFeature } from '../types/device';
import { cloneDeviceProfile, copyDeviceAsCustom, getDeviceViewport } from '../utils/device-profile';

function getDevice(id: string): DeviceProfile {
  const device = SYSTEM_DEVICES.find((candidate) => candidate.id === id);
  if (device === undefined) {
    throw new Error(`Missing test device: ${id}`);
  }
  return cloneDeviceProfile(device);
}

function firstCamera(profile: DeviceProfile): DeviceCamera {
  const camera = profile.portrait.cameras[0];
  if (camera === undefined) {
    throw new Error('The fixture must contain a portrait camera.');
  }
  return camera;
}

function firstFeature(profile: DeviceProfile): DisplayFeature {
  const feature = profile.portrait.displayFeatures[0];
  if (feature === undefined) {
    throw new Error('The fixture must contain a portrait display feature.');
  }
  return feature;
}

describe('getDeviceViewport', () => {
  it('reads independently stored portrait and landscape configs', () => {
    const profile = getDevice('iphone-15-pro');

    const portrait = getDeviceViewport(profile, 'portrait');
    const landscape = getDeviceViewport(profile, 'landscape');

    expect(portrait).toBe(profile.portrait);
    expect(landscape).toBe(profile.landscape);
    expect(portrait).toMatchObject({
      width: 393,
      height: 852,
      safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    });
    expect(landscape).toMatchObject({
      width: 852,
      height: 393,
      safeArea: { top: 0, right: 59, bottom: 21, left: 59 },
    });
    expect(portrait.cameras[0]?.id).not.toBe(landscape.cameras[0]?.id);
  });
});

describe('copyDeviceAsCustom', () => {
  it('creates a custom device with deterministic metadata and a deep copy', () => {
    const source = getDevice('iphone-15-pro');
    const sourceBefore = cloneDeviceProfile(source);
    const copy = copyDeviceAsCustom(source, {
      id: 'custom-iphone',
      name: 'QA iPhone',
      now: 1_234,
      favorite: true,
    });

    expect(copy).toMatchObject({
      id: 'custom-iphone',
      name: 'QA iPhone',
      isSystem: false,
      favorite: true,
      createdAt: 1_234,
      updatedAt: 1_234,
    });
    expect(copy).not.toBe(source);
    expect(copy.portrait).not.toBe(source.portrait);
    expect(copy.landscape).not.toBe(source.landscape);
    expect(copy.portrait.safeArea).not.toBe(source.portrait.safeArea);
    expect(copy.portrait.cameras).not.toBe(source.portrait.cameras);
    expect(copy.portrait.displayFeatures).not.toBe(source.portrait.displayFeatures);
    expect(copy.frame).not.toBe(source.frame);
    expect(copy.frame.insets).not.toBe(source.frame.insets);
    expect(copy.tags).not.toBe(source.tags);

    const sourceCamera = firstCamera(source);
    const copyCamera = firstCamera(copy);
    const sourceFeature = firstFeature(source);
    const copyFeature = firstFeature(copy);
    expect(copyCamera).not.toBe(sourceCamera);
    expect(copyCamera.position).not.toBe(sourceCamera.position);
    expect(copyCamera.style).not.toBe(sourceCamera.style);
    expect(copyFeature).not.toBe(sourceFeature);
    expect(copyFeature.style).not.toBe(sourceFeature.style);

    copy.portrait.safeArea.top = 1;
    copyCamera.width = 200;
    if (copyCamera.position.mode === 'anchor') {
      copyCamera.position.offsetX = 25;
    }
    if (copyCamera.style !== undefined) {
      copyCamera.style.backgroundColor = '#ff0000';
    }
    copyFeature.x = 1;
    if (copyFeature.style !== undefined) {
      copyFeature.style.opacity = 0.25;
    }
    copy.frame.insets.top = 99;
    copy.tags.push('customized');

    expect(source).toEqual(sourceBefore);
  });

  it('refuses to reuse the system device ID', () => {
    const source = getDevice('iphone-15-pro');

    expect(() => copyDeviceAsCustom(source, { id: source.id, now: 100 })).toThrow(
      'must use a new ID',
    );
  });
});
