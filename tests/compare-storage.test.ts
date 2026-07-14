import { afterEach, describe, expect, it, vi } from 'vitest';
import { COMPARE_STORAGE_VERSION, STORAGE_KEYS } from '../constants/storage-keys';
import {
  compareStorageService,
  migrateCompareData,
  sanitizeCompareData,
} from '../services/compare-storage-service';
import { storageService } from '../services/storage-service';

afterEach(() => vi.restoreAllMocks());

function validInstance(id: string, deviceId = 'iphone-15-pro') {
  return {
    id,
    deviceId,
    url: 'example.com',
    orientation: 'portrait',
    scale: 1,
    position: { x: 20, y: 30 },
    safeAreaVisible: true,
    cameraVisible: true,
    displayFeaturesVisible: true,
    frameVisible: true,
    iframeStatus: 'loaded',
    selected: true,
    createdAt: 10,
    updatedAt: 20,
  };
}

function legacyCompareData() {
  return {
    instances: [
      validInstance('valid-instance', 'deleted-custom-profile'),
      validInstance('valid-instance', 'duplicate-id'),
      { ...validInstance('invalid-position'), position: { x: Number.NaN, y: 0 } },
      { ...validInstance('invalid-url'), url: 'javascript:alert(1)' },
    ],
    selectedInstanceIds: ['valid-instance'],
    canvasOffset: { x: 50, y: -25 },
    canvasScale: 1.25,
    globalUrl: 'localhost:3000',
    syncScrollEnabled: true,
    syncNavigationEnabled: false,
    syncRefreshEnabled: true,
    syncOrientationEnabled: false,
    layoutMode: 'grid',
    showGrid: true,
    snapToGrid: true,
    gridSize: 24,
  };
}

describe('compare persisted-state migration', () => {
  it('migrates v1 through every step and defaults new workspace/panel fields', () => {
    const migrated = migrateCompareData(1, legacyCompareData());

    expect(migrated).toMatchObject({
      workspaceMode: 'single',
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      globalUrl: 'http://localhost:3000/',
      layoutMode: 'grid',
    });
    expect(migrated?.instances).toHaveLength(1);
    expect(migrated?.instances[0]).toMatchObject({
      id: 'valid-instance',
      deviceId: 'deleted-custom-profile',
      url: 'https://example.com/',
    });
    expect(migrated?.instances[0]).not.toHaveProperty('selected');
    expect(migrated?.instances[0]).not.toHaveProperty('iframeStatus');
  });

  it('keeps structurally valid instances whose device profile is currently missing', () => {
    const sanitized = sanitizeCompareData({
      ...legacyCompareData(),
      workspaceMode: 'compare',
      leftPanelCollapsed: true,
      rightPanelCollapsed: false,
      instances: [validInstance('recoverable', 'missing-profile-id')],
    });

    expect(sanitized?.instances).toHaveLength(1);
    expect(sanitized?.instances[0]?.deviceId).toBe('missing-profile-id');
  });

  it('clamps finite scales and grid sizes while rejecting unsupported versions', () => {
    const sanitized = sanitizeCompareData({
      ...legacyCompareData(),
      workspaceMode: 'compare',
      leftPanelCollapsed: false,
      rightPanelCollapsed: false,
      canvasScale: 99,
      gridSize: 1,
      instances: [{ ...validInstance('scaled-instance'), scale: 99 }],
    });

    expect(sanitized?.canvasScale).toBe(2);
    expect(sanitized?.gridSize).toBe(4);
    expect(sanitized?.instances[0]?.scale).toBe(2);
    expect(migrateCompareData(0, legacyCompareData())).toBeNull();
    expect(migrateCompareData(COMPARE_STORAGE_VERSION + 1, legacyCompareData())).toBeNull();
  });

  it('drops instance IDs that cannot be registered by the runtime bridge', () => {
    const sanitized = sanitizeCompareData({
      ...legacyCompareData(),
      instances: [validInstance('short'), validInstance('contains spaces')],
    });

    expect(sanitized?.instances).toEqual([]);
  });

  it('reads an older independent envelope and writes the migrated current version back', async () => {
    const read = vi
      .spyOn(storageService, 'read')
      .mockImplementation((_key, version) =>
        Promise.resolve(version === COMPARE_STORAGE_VERSION ? null : legacyCompareData()),
      );
    const write = vi.spyOn(storageService, 'write').mockResolvedValue();

    const migrated = await compareStorageService.read();

    expect(migrated?.workspaceMode).toBe('single');
    expect(read).toHaveBeenNthCalledWith(1, STORAGE_KEYS.compare, COMPARE_STORAGE_VERSION);
    expect(read).toHaveBeenNthCalledWith(2, STORAGE_KEYS.compare, 1);
    expect(write).toHaveBeenCalledWith(STORAGE_KEYS.compare, COMPARE_STORAGE_VERSION, migrated);
  });
});
