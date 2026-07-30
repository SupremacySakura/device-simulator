import { describe, expect, it } from 'vitest';
import { DEVICE_PRESETS } from '../components/compare/device-presets';
import { SYSTEM_DEVICES } from '../constants/default-devices';
import DEVICE_SOURCES from '../constants/device-sources.json';
import type { DeviceConfidence, DeviceProfile } from '../types/device';
import { getDeviceOuterSize } from '../utils/instance-size';
import { validateDeviceProfile } from '../utils/validation';

const P0_IDS = [
  'iphone-se-3rd-generation',
  'iphone-14',
  'iphone-15-pro',
  'iphone-15-pro-max',
  'iphone-16-pro',
  'google-pixel-8',
  'google-pixel-8-pro',
  'google-pixel-9',
  'samsung-galaxy-s24',
  'ipad-air-10-9',
  'ipad-pro-11',
  'surface-pro-7',
  'surface-duo-spanned',
] as const;

const SUPPLEMENTAL_IDS = ['iphone-15', 'ipad-mini'] as const;
const REFERENCE_IDS = ['desktop-1280x720', 'desktop-1440x900'] as const;
const EXPECTED_SYSTEM_IDS = [...P0_IDS, ...SUPPLEMENTAL_IDS, ...REFERENCE_IDS] as const;

const EXPECTED_GEOMETRY: Record<
  (typeof EXPECTED_SYSTEM_IDS)[number],
  readonly [number, number, number, number, number, DeviceConfidence]
> = {
  'iphone-se-3rd-generation': [375, 667, 667, 375, 2, 'high'],
  'iphone-14': [390, 844, 844, 390, 3, 'high'],
  'iphone-15-pro': [393, 852, 852, 393, 3, 'high'],
  'iphone-15-pro-max': [430, 932, 932, 430, 3, 'high'],
  'iphone-16-pro': [402, 874, 874, 402, 3, 'high'],
  'google-pixel-8': [412, 915, 915, 412, 2.625, 'medium'],
  'google-pixel-8-pro': [448, 997, 997, 448, 3, 'medium'],
  'google-pixel-9': [412, 924, 924, 412, 2.625, 'medium'],
  'samsung-galaxy-s24': [360, 780, 780, 360, 3, 'medium'],
  'ipad-air-10-9': [820, 1180, 1180, 820, 2, 'medium'],
  'ipad-pro-11': [834, 1194, 1194, 834, 2, 'medium'],
  'surface-pro-7': [912, 1368, 1368, 912, 2, 'medium'],
  'surface-duo-spanned': [1114, 720, 720, 1114, 2.5, 'medium'],
  'iphone-15': [393, 852, 852, 393, 3, 'high'],
  'ipad-mini': [744, 1133, 1133, 744, 2, 'medium'],
  'desktop-1280x720': [1280, 720, 1280, 720, 1, 'high'],
  'desktop-1440x900': [1440, 900, 1440, 900, 1, 'high'],
};

const REQUIRED_SOURCE_URLS = [
  'https://raw.githubusercontent.com/ChromeDevTools/devtools-frontend/main/front_end/models/emulation/EmulatedDevices.ts',
  'https://developer.apple.com/design/human-interface-guidelines/layout',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-14.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-15-pro-max.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-16-pro.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-se-3rd-generation.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-air-5th-generation.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-pro-11-inch-4th-generation.pdf',
  'https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-mini-6th-generation.pdf',
  'https://support.google.com/pixelphone/answer/7158570?hl=en-CA',
  'https://store.google.com/product/pixel_8_specs?hl=en-US',
  'https://store.google.com/product/pixel_8_pro_specs?hl=en-US',
  'https://store.google.com/us/product/pixel_9_specs?hl=en-US',
  'https://github.com/microsoft/playwright/pull/37125',
  'https://www.samsung.com/us/support/answer/ANS00087902/',
  'https://images.samsung.com/is/content/samsung/assets/global/ir/docs/2024_1Q_Interim_Report.pdf',
  'https://support.microsoft.com/en-us/surface/models/surface-pro-7-specs-and-features',
  'https://support.microsoft.com/en-us/surface/models/surface-duo-1st-gen-features-and-specs',
] as const;

function deviceById(id: string): DeviceProfile {
  const device = SYSTEM_DEVICES.find((candidate) => candidate.id === id);
  if (device === undefined) throw new Error(`Missing system device: ${id}`);
  return device;
}

describe('system device dataset', () => {
  it('contains the exact approved device IDs without duplicates', () => {
    expect(SYSTEM_DEVICES.map((device) => device.id).sort()).toEqual(
      [...EXPECTED_SYSTEM_IDS].sort(),
    );
    expect(new Set(SYSTEM_DEVICES.map((device) => device.id)).size).toBe(17);
  });

  it.each(EXPECTED_SYSTEM_IDS)('matches the approved geometry and confidence for %s', (id) => {
    const device = deviceById(id);
    const [portraitWidth, portraitHeight, landscapeWidth, landscapeHeight, dpr, confidence] =
      EXPECTED_GEOMETRY[id];

    expect(device).toMatchObject({
      isSystem: true,
      devicePixelRatio: dpr,
      confidence,
      portrait: { width: portraitWidth, height: portraitHeight },
      landscape: { width: landscapeWidth, height: landscapeHeight },
    });
  });

  it('validates every complete profile and keeps semantic identities unique', () => {
    for (const device of SYSTEM_DEVICES) {
      expect(validateDeviceProfile(device), device.id).toMatchObject({ success: true });
    }

    const semanticKeys = SYSTEM_DEVICES.map(
      (device) => `${device.brand ?? ''}:${device.model ?? ''}:${device.id}`,
    );
    expect(new Set(semanticKeys).size).toBe(SYSTEM_DEVICES.length);
  });

  it('uses the audited Safe Areas and cutout geometry', () => {
    expect(deviceById('iphone-14').portrait).toMatchObject({
      safeArea: { top: 47, right: 0, bottom: 34, left: 0 },
      cameras: [{ position: { mode: 'absolute', x: 114, y: 0 }, width: 162, height: 34 }],
    });
    expect(deviceById('iphone-16-pro').portrait).toMatchObject({
      safeArea: { top: 62, right: 0, bottom: 34, left: 0 },
      cameras: [
        {
          position: { mode: 'absolute', x: 139, y: 14 },
          width: 125,
          height: 37,
          borderRadius: 19,
        },
      ],
    });
    expect(deviceById('google-pixel-9').portrait).toMatchObject({
      safeArea: { top: 58, right: 0, bottom: 0, left: 0 },
      cameras: [{ position: { mode: 'absolute', x: 188, y: 0 }, width: 37, height: 58 }],
    });
  });

  it.each([
    ['iphone-14', 0, 114, 34, 162],
    ['iphone-15', 11, 134, 37, 125],
    ['iphone-15-pro', 11, 134, 37, 125],
    ['iphone-15-pro-max', 11, 152, 37, 125],
    ['iphone-16-pro', 14, 138, 37, 125],
    ['google-pixel-8', 0, 184, 50, 46],
    ['google-pixel-8-pro', 0, 206, 50, 37],
    ['google-pixel-9', 0, 187, 58, 37],
  ] as const)(
    'keeps the camera visible at the counterclockwise-rotated position for %s in landscape',
    (id, x, y, width, height) => {
      const device = deviceById(id);

      expect(device.landscape.cameras).toHaveLength(device.portrait.cameras.length);
      expect(device.landscape.cameras[0]).toMatchObject({
        position: { mode: 'absolute', x, y },
        width,
        height,
        visible: true,
      });
    },
  );

  it.each([
    ['google-pixel-8', 50],
    ['google-pixel-8-pro', 50],
    ['google-pixel-9', 58],
  ] as const)('keeps the landscape content clear of the left-side camera for %s', (id, left) => {
    expect(deviceById(id).landscape.safeArea).toEqual({ top: 0, right: 0, bottom: 0, left });
  });

  it.each([
    ['iphone-14', 432, 886],
    ['iphone-15', 433, 892],
    ['iphone-15-pro', 427, 886],
    ['iphone-15-pro-max', 464, 966],
    ['iphone-16-pro', 432, 904],
  ] as const)(
    'matches Apple housing-to-active-area dimensions for %s',
    (id, outerWidth, outerHeight) => {
      expect(getDeviceOuterSize(deviceById(id), 'portrait')).toEqual({
        width: outerWidth,
        height: outerHeight,
      });
    },
  );

  it.each([
    ['iphone-se-3rd-generation', 431, 887, 887, 431],
    ['google-pixel-8', 452, 961, 961, 452],
    ['google-pixel-8-pro', 492, 1045, 1045, 492],
    ['google-pixel-9', 456, 966, 966, 456],
    ['samsung-galaxy-s24', 386, 802, 802, 386],
    ['ipad-air-10-9', 924, 1284, 1284, 924],
    ['ipad-pro-11', 924, 1284, 1284, 924],
    ['ipad-mini', 856, 1245, 1245, 856],
    ['surface-pro-7', 1058, 1536, 1536, 1058],
    ['surface-duo-spanned', 1180, 916, 916, 1180],
  ] as const)(
    'matches the audited housing extent for %s',
    (id, portraitWidth, portraitHeight, landscapeWidth, landscapeHeight) => {
      const device = deviceById(id);

      expect(getDeviceOuterSize(device, 'portrait')).toEqual({
        width: portraitWidth,
        height: portraitHeight,
      });
      expect(getDeviceOuterSize(device, 'landscape')).toEqual({
        width: landscapeWidth,
        height: landscapeHeight,
      });
    },
  );

  it('never makes a physical housing corner squarer than its rounded display', () => {
    for (const id of [...P0_IDS, ...SUPPLEMENTAL_IDS]) {
      const device = deviceById(id);
      expect(device.frame.borderRadius, id).toBeGreaterThanOrEqual(
        device.portrait.screenBorderRadius,
      );
    }
  });

  it.each(['iphone-14', 'iphone-15', 'iphone-15-pro', 'iphone-15-pro-max', 'iphone-16-pro'])(
    'keeps the screen and housing corners concentric for %s',
    (id) => {
      const device = deviceById(id);
      const totalEdgeWidth = device.frame.insets.left + device.frame.borderWidth;

      expect(device.frame.insets).toEqual({
        top: device.frame.insets.left,
        right: device.frame.insets.left,
        bottom: device.frame.insets.left,
        left: device.frame.insets.left,
      });
      expect(device.frame.borderRadius).toBe(device.portrait.screenBorderRadius + totalEdgeWidth);
    },
  );

  it('models the Surface Duo hinge in both spanned orientations', () => {
    expect(deviceById('surface-duo-spanned')).toMatchObject({
      portrait: {
        displayFeatures: [{ type: 'hinge', x: 540, y: 0, width: 34, height: 720 }],
      },
      landscape: {
        displayFeatures: [{ type: 'hinge', x: 0, y: 540, width: 720, height: 34 }],
      },
    });
  });

  it('keeps unverified S24 and iPad obstruction facts neutral', () => {
    for (const id of ['samsung-galaxy-s24', 'ipad-air-10-9', 'ipad-pro-11', 'ipad-mini']) {
      const device = deviceById(id);
      for (const viewport of [device.portrait, device.landscape]) {
        expect(viewport.safeArea).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
        expect(viewport.cameras).toEqual([]);
        expect(viewport.displayFeatures).toEqual([]);
      }
    }
  });

  it('resolves every production compare preset to a system device', () => {
    const systemIds = new Set(SYSTEM_DEVICES.map((device) => device.id));
    for (const group of DEVICE_PRESETS) {
      for (const id of group.deviceIds) expect(systemIds.has(id), `${group.id}:${id}`).toBe(true);
    }
  });
});

describe('device source ledger', () => {
  it('contains one matching audit record for every system profile', () => {
    expect(Object.keys(DEVICE_SOURCES).sort()).toEqual([...EXPECTED_SYSTEM_IDS].sort());

    for (const device of SYSTEM_DEVICES) {
      const source = DEVICE_SOURCES[device.id as keyof typeof DEVICE_SOURCES];
      expect(source.deviceId).toBe(device.id);
      expect(source.confidence).toBe(device.confidence);
      expect(source.collectedAt).toBe('2026-07-30');
      if (source.kind === 'device') expect(source.sourceUrls.length).toBeGreaterThan(0);
      expect(source.notes.length).toBeGreaterThan(0);
      for (const url of source.sourceUrls) expect(() => new URL(url)).not.toThrow();
    }
  });

  it('keeps restricted links and cross-validation claims out of internal reference viewports', () => {
    for (const id of REFERENCE_IDS) {
      const source = DEVICE_SOURCES[id];
      expect(source.sourceUrls).toEqual([]);
      expect(source.crossValidated).toBe(false);
    }

    for (const source of Object.values(DEVICE_SOURCES)) {
      for (const url of source.sourceUrls) {
        expect(new URL(url).hostname).not.toBe('my.feishu.cn');
      }
    }
  });

  it('covers every required primary or cross-check source', () => {
    const recordedUrls = new Set(
      Object.values(DEVICE_SOURCES).flatMap((source) => source.sourceUrls),
    );
    for (const url of REQUIRED_SOURCE_URLS) expect(recordedUrls.has(url), url).toBe(true);
  });

  it('matches approved priorities and reference semantics', () => {
    for (const id of P0_IDS) expect(DEVICE_SOURCES[id].priority).toBe('P0');
    for (const id of SUPPLEMENTAL_IDS) expect(DEVICE_SOURCES[id].priority).toBe('supplemental');
    for (const id of REFERENCE_IDS) {
      expect(DEVICE_SOURCES[id]).toMatchObject({ kind: 'reference', priority: 'reference' });
    }
  });

  it('enumerates every neutral Safe Area fallback as estimated', () => {
    const expectedFields = ['portrait', 'landscape'].flatMap((orientation) =>
      ['top', 'right', 'bottom', 'left'].map((edge) => `${orientation}.safeArea.${edge}`),
    );

    for (const id of ['ipad-air-10-9', 'ipad-pro-11', 'ipad-mini'] as const) {
      expect(DEVICE_SOURCES[id].estimatedFields).toEqual(expectedFields);
      expect(DEVICE_SOURCES[id].crossValidated).toBe(false);
    }

    expect(DEVICE_SOURCES['samsung-galaxy-s24'].estimatedFields).toEqual([
      ...expectedFields,
      'frame.insets.top',
      'frame.insets.right',
      'frame.insets.bottom',
      'frame.insets.left',
    ]);
  });

  it('marks every derived housing inset as medium-confidence and estimated', () => {
    const expectedFrameFields = [
      'frame.insets.top',
      'frame.insets.right',
      'frame.insets.bottom',
      'frame.insets.left',
    ];

    for (const id of [
      'google-pixel-8',
      'google-pixel-8-pro',
      'google-pixel-9',
      'samsung-galaxy-s24',
      'surface-pro-7',
      'surface-duo-spanned',
    ] as const) {
      expect(DEVICE_SOURCES[id].confidence).toBe('medium');
      expect(DEVICE_SOURCES[id].estimatedFields).toEqual(
        expect.arrayContaining(expectedFrameFields),
      );
      expect(DEVICE_SOURCES[id].crossValidated).toBe(false);
    }
  });
});
