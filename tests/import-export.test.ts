import { describe, expect, it } from 'vitest';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import {
  DEVICE_EXPORT_SCHEMA_VERSION,
  importDevicesFromJson,
  mergeImportedDevices,
  parseDeviceExportJson,
  serializeDeviceExport,
} from '../services/import-export-service';
import type { DeviceProfile } from '../types/device';
import { cloneDeviceProfile, copyDeviceAsCustom } from '../utils/device-profile';

function getDevice(id: string): DeviceProfile {
  const device = SYSTEM_DEVICES.find((candidate) => candidate.id === id);
  if (device === undefined) {
    throw new Error(`Missing test device: ${id}`);
  }
  return cloneDeviceProfile(device);
}

function getOnlyDevice(devices: readonly DeviceProfile[]): DeviceProfile {
  const device = devices[0];
  if (device === undefined || devices.length !== 1) {
    throw new Error(`Expected exactly one device, received ${devices.length}.`);
  }
  return device;
}

function makeConflictPair(): { existing: DeviceProfile; imported: DeviceProfile } {
  const existing = copyDeviceAsCustom(getDevice('iphone-15-pro'), {
    id: 'custom-phone',
    name: 'My Phone',
    now: 100,
  });
  const imported = cloneDeviceProfile(existing);
  imported.portrait.width = 401;
  imported.updatedAt = 200;
  return { existing, imported };
}

describe('device import envelope', () => {
  it('serializes and parses a valid versioned envelope', () => {
    const json = serializeDeviceExport([getDevice('iphone-15-pro')], {
      exportedAt: 123,
      pretty: false,
    });
    const result = parseDeviceExportJson(json);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected a valid export envelope.');
    }
    expect(result.data.schemaVersion).toBe(DEVICE_EXPORT_SCHEMA_VERSION);
    expect(result.data.exportedAt).toBe(123);
    expect(result.data.devices).toHaveLength(1);
  });

  it('rejects malformed JSON, unsupported schemas, and duplicate device IDs', () => {
    expect(parseDeviceExportJson('{broken').success).toBe(false);

    const source = getDevice('iphone-15-pro');
    const unsupported = parseDeviceExportJson(
      JSON.stringify({ schemaVersion: 99, exportedAt: 10, devices: [source] }),
    );
    expect(unsupported.success).toBe(false);
    if (unsupported.success) {
      throw new Error('Expected unsupported schema validation to fail.');
    }
    expect(unsupported.issues).toContainEqual(
      expect.objectContaining({ path: '$.schemaVersion', code: 'schema' }),
    );

    const duplicate = parseDeviceExportJson(
      JSON.stringify({
        schemaVersion: DEVICE_EXPORT_SCHEMA_VERSION,
        exportedAt: 10,
        devices: [source, source],
      }),
    );
    expect(duplicate.success).toBe(false);
    if (duplicate.success) {
      throw new Error('Expected duplicate device IDs to fail.');
    }
    expect(duplicate.issues).toContainEqual(expect.objectContaining({ code: 'duplicate' }));
  });

  it('reports an invalid individual device without rejecting the valid envelope', () => {
    const invalidDevice = getDevice('iphone-15-pro');
    invalidDevice.name = '';
    const result = importDevicesFromJson(
      JSON.stringify({
        schemaVersion: DEVICE_EXPORT_SCHEMA_VERSION,
        exportedAt: 10,
        devices: [invalidDevice],
      }),
      [],
      { conflictStrategy: 'skip', now: 20, idFactory: () => 'unused-id' },
    );

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('The envelope itself should remain importable.');
    }
    expect(result.data).toMatchObject({ importedCount: 0, failedCount: 1 });
    expect(result.data.failures[0]?.issues[0]?.path).toContain('$.devices[0]');
  });
});

describe('mergeImportedDevices conflict strategies', () => {
  it('skips a conflicting import when strategy is skip', () => {
    const { existing, imported } = makeConflictPair();
    const result = mergeImportedDevices([imported], [existing], {
      conflictStrategy: 'skip',
      now: 500,
      idFactory: () => 'unused-id',
    });

    expect(result).toMatchObject({
      importedCount: 0,
      skippedCount: 1,
      overwrittenCount: 0,
      copiedCount: 0,
    });
    expect(result.conflicts[0]).toMatchObject({
      reason: 'id-and-name',
      resolution: 'skip',
    });
    expect(getOnlyDevice(result.devices).portrait.width).toBe(existing.portrait.width);
  });

  it('overwrites a conflicting custom device while preserving its creation time', () => {
    const { existing, imported } = makeConflictPair();
    const result = mergeImportedDevices([imported], [existing], {
      conflictStrategy: 'overwrite',
      now: 500,
      idFactory: () => 'unused-id',
    });
    const replacement = getOnlyDevice(result.devices);

    expect(result).toMatchObject({ importedCount: 1, overwrittenCount: 1 });
    expect(replacement).toMatchObject({
      id: existing.id,
      isSystem: false,
      createdAt: 100,
      updatedAt: 500,
    });
    expect(replacement.portrait.width).toBe(401);
    expect(result.conflicts[0]?.resolution).toBe('overwrite');
  });

  it('creates an independent ID and name when strategy is copy', () => {
    const { existing, imported } = makeConflictPair();
    const result = mergeImportedDevices([imported], [existing], {
      conflictStrategy: 'copy',
      now: 500,
      idFactory: () => 'custom-phone-copy',
    });
    const copied = result.importedDevices[0];
    if (copied === undefined) {
      throw new Error('Expected a copied imported device.');
    }

    expect(result).toMatchObject({ importedCount: 1, copiedCount: 1 });
    expect(copied).toMatchObject({
      id: 'custom-phone-copy',
      name: 'My Phone 副本',
      isSystem: false,
      createdAt: 500,
      updatedAt: 500,
    });
    expect(result.conflicts[0]?.resolution).toBe('copy');
  });

  it('always converts an imported system preset into a new custom device', () => {
    const result = mergeImportedDevices([getDevice('google-pixel-8')], [], {
      conflictStrategy: 'skip',
      now: 500,
      idFactory: () => 'imported-system-copy',
    });
    const imported = getOnlyDevice(result.importedDevices);

    expect(imported).toMatchObject({
      id: 'imported-system-copy',
      name: 'Google Pixel 8',
      isSystem: false,
      createdAt: 500,
      updatedAt: 500,
    });
  });
});
