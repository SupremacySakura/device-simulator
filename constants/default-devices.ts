import type {
  DeviceCamera,
  DeviceFrameConfig,
  DeviceFrameInsets,
  DeviceProfile,
  DeviceViewportConfig,
  DisplayFeature,
  SafeAreaInsets,
} from '../types/device';

const IOS_PHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const ANDROID_PHONE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const IPAD_USER_AGENT =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const ZERO_SAFE_AREA: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

interface ViewportOptions {
  width: number;
  height: number;
  screenBorderRadius?: number;
  safeArea?: SafeAreaInsets;
  cameras?: DeviceCamera[];
  displayFeatures?: DisplayFeature[];
}

function viewport({
  width,
  height,
  screenBorderRadius = 0,
  safeArea = ZERO_SAFE_AREA,
  cameras = [],
  displayFeatures = [],
}: ViewportOptions): DeviceViewportConfig {
  return {
    width,
    height,
    screenBorderRadius,
    safeArea: { ...safeArea },
    cameras,
    displayFeatures,
  };
}

function safeArea(top: number, right: number, bottom: number, left: number): SafeAreaInsets {
  return { top, right, bottom, left };
}

function cutout(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  borderRadius: number,
): DeviceCamera {
  return {
    id,
    name,
    position: { mode: 'absolute', x, y },
    width,
    height,
    shape: 'rounded-rect',
    borderRadius,
    layoutMode: 'overlay',
    visible: true,
    style: { backgroundColor: '#050505', opacity: 1 },
  };
}

function hinge(id: string, x: number, y: number, width: number, height: number): DisplayFeature {
  return {
    id,
    name: 'Hinge',
    type: 'hinge',
    x,
    y,
    width,
    height,
    visible: true,
    style: { backgroundColor: '#111827', opacity: 1 },
  };
}

interface HardwareFrameOptions {
  housingToActiveArea: DeviceFrameInsets;
  borderRadius: number;
  backgroundColor?: string;
  borderColor?: string;
}

function hardwareFrame({
  housingToActiveArea,
  borderRadius,
  backgroundColor = '#171717',
  borderColor = '#525252',
}: HardwareFrameOptions): DeviceFrameConfig {
  const borderWidth = 1;

  return {
    enabled: true,
    insets: {
      top: housingToActiveArea.top - borderWidth,
      right: housingToActiveArea.right - borderWidth,
      bottom: housingToActiveArea.bottom - borderWidth,
      left: housingToActiveArea.left - borderWidth,
    },
    borderRadius,
    backgroundColor,
    borderColor,
    borderWidth,
    shadowEnabled: true,
    shadow: '0 18px 48px rgba(0, 0, 0, 0.22)',
  };
}

function uniformInsets(value: number): DeviceFrameInsets {
  return { top: value, right: value, bottom: value, left: value };
}

function modernIphoneFrame(
  screenBorderRadius: number,
  housingToActiveArea: number,
): DeviceFrameConfig {
  return hardwareFrame({
    housingToActiveArea: uniformInsets(housingToActiveArea),
    borderRadius: screenBorderRadius + housingToActiveArea,
    backgroundColor: '#09090b',
    borderColor: '#52525b',
  });
}

function desktopFrame(): DeviceFrameConfig {
  return {
    enabled: true,
    insets: { top: 30, right: 7, bottom: 7, left: 7 },
    borderRadius: 14,
    backgroundColor: '#d4d4d8',
    borderColor: '#a1a1aa',
    borderWidth: 1,
    shadowEnabled: true,
    shadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
  };
}

/**
 * Public-source-backed CSS viewport profiles. Source URLs, collection dates,
 * confidence rationale, and estimated fields live in device-sources.json.
 * Modern iPhone frame insets are scaled from Apple's housing-to-active-area
 * drawings. CSS corner radii and visual styling remain presentation approximations.
 * Landscape cutouts are explicit counterclockwise transforms of the sourced portrait bounds.
 */
export const DEFAULT_DEVICES = [
  {
    id: 'iphone-se-3rd-generation',
    name: 'iPhone SE (3rd generation)',
    brand: 'Apple',
    model: 'iPhone SE (3rd generation)',
    category: 'phone',
    devicePixelRatio: 2,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({ width: 375, height: 667 }),
    landscape: viewport({ width: 667, height: 375 }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 110, right: 28, bottom: 110, left: 28 },
      borderRadius: 58,
      backgroundColor: '#09090b',
      borderColor: '#52525b',
    }),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'iphone', 'compact'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-14',
    name: 'iPhone 14',
    brand: 'Apple',
    model: 'iPhone 14',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({
      width: 390,
      height: 844,
      screenBorderRadius: 45,
      safeArea: safeArea(47, 0, 34, 0),
      cameras: [cutout('iphone-14-notch-portrait', 'Notch', 114, 0, 162, 34, 17)],
    }),
    landscape: viewport({
      width: 844,
      height: 390,
      screenBorderRadius: 45,
      safeArea: safeArea(0, 47, 21, 47),
      cameras: [cutout('iphone-14-notch-landscape', 'Notch', 0, 114, 34, 162, 17)],
    }),
    frame: modernIphoneFrame(45, 21),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'iphone', 'notch'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-15-pro',
    name: 'iPhone 15 Pro',
    brand: 'Apple',
    model: 'iPhone 15 Pro',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({
      width: 393,
      height: 852,
      screenBorderRadius: 47,
      safeArea: safeArea(59, 0, 34, 0),
      cameras: [
        cutout('iphone-15-pro-dynamic-island-portrait', 'Dynamic Island', 134, 11, 125, 37, 19),
      ],
    }),
    landscape: viewport({
      width: 852,
      height: 393,
      screenBorderRadius: 47,
      safeArea: safeArea(0, 59, 21, 59),
      cameras: [
        cutout('iphone-15-pro-dynamic-island-landscape', 'Dynamic Island', 11, 134, 37, 125, 19),
      ],
    }),
    frame: modernIphoneFrame(47, 17),
    isSystem: true,
    favorite: true,
    tags: ['ios', 'iphone', 'dynamic-island'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({
      width: 430,
      height: 932,
      screenBorderRadius: 55,
      safeArea: safeArea(59, 0, 34, 0),
      cameras: [
        cutout('iphone-15-pro-max-dynamic-island-portrait', 'Dynamic Island', 153, 11, 125, 37, 19),
      ],
    }),
    landscape: viewport({
      width: 932,
      height: 430,
      screenBorderRadius: 55,
      safeArea: safeArea(0, 59, 21, 59),
      cameras: [
        cutout(
          'iphone-15-pro-max-dynamic-island-landscape',
          'Dynamic Island',
          11,
          152,
          37,
          125,
          19,
        ),
      ],
    }),
    frame: modernIphoneFrame(55, 17),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'iphone', 'large', 'dynamic-island'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    brand: 'Apple',
    model: 'iPhone 16 Pro',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({
      width: 402,
      height: 874,
      screenBorderRadius: 49,
      safeArea: safeArea(62, 0, 34, 0),
      cameras: [
        cutout('iphone-16-pro-dynamic-island-portrait', 'Dynamic Island', 139, 14, 125, 37, 19),
      ],
    }),
    landscape: viewport({
      width: 874,
      height: 402,
      screenBorderRadius: 49,
      safeArea: safeArea(0, 62, 21, 62),
      cameras: [
        cutout('iphone-16-pro-dynamic-island-landscape', 'Dynamic Island', 14, 138, 37, 125, 19),
      ],
    }),
    frame: modernIphoneFrame(49, 15),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'iphone', 'dynamic-island'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'google-pixel-8',
    name: 'Google Pixel 8',
    brand: 'Google',
    model: 'Pixel 8',
    category: 'phone',
    devicePixelRatio: 2.625,
    confidence: 'medium',
    userAgent: ANDROID_PHONE_USER_AGENT,
    portrait: viewport({
      width: 412,
      height: 915,
      screenBorderRadius: 36,
      safeArea: safeArea(50, 0, 0, 0),
      cameras: [cutout('pixel-8-cutout-portrait', 'Camera cutout', 182, 0, 46, 50, 23)],
    }),
    landscape: viewport({
      width: 915,
      height: 412,
      screenBorderRadius: 36,
      safeArea: safeArea(0, 0, 0, 50),
      cameras: [cutout('pixel-8-cutout-landscape', 'Camera cutout', 0, 184, 50, 46, 23)],
    }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 23, right: 20, bottom: 23, left: 20 },
      borderRadius: 56,
    }),
    isSystem: true,
    favorite: false,
    tags: ['android', 'pixel'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'google-pixel-8-pro',
    name: 'Google Pixel 8 Pro',
    brand: 'Google',
    model: 'Pixel 8 Pro',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'medium',
    userAgent: ANDROID_PHONE_USER_AGENT,
    portrait: viewport({
      width: 448,
      height: 997,
      screenBorderRadius: 36,
      safeArea: safeArea(50, 0, 0, 0),
      cameras: [cutout('pixel-8-pro-cutout-portrait', 'Camera cutout', 205, 0, 37, 50, 19)],
    }),
    landscape: viewport({
      width: 997,
      height: 448,
      screenBorderRadius: 36,
      safeArea: safeArea(0, 0, 0, 50),
      cameras: [cutout('pixel-8-pro-cutout-landscape', 'Camera cutout', 0, 206, 50, 37, 19)],
    }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 24, right: 22, bottom: 24, left: 22 },
      borderRadius: 58,
    }),
    isSystem: true,
    favorite: false,
    tags: ['android', 'pixel', 'large'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'google-pixel-9',
    name: 'Google Pixel 9',
    brand: 'Google',
    model: 'Pixel 9',
    category: 'phone',
    devicePixelRatio: 2.625,
    confidence: 'medium',
    userAgent: ANDROID_PHONE_USER_AGENT,
    portrait: viewport({
      width: 412,
      height: 924,
      screenBorderRadius: 36,
      safeArea: safeArea(58, 0, 0, 0),
      cameras: [cutout('pixel-9-cutout-portrait', 'Camera cutout', 188, 0, 37, 58, 19)],
    }),
    landscape: viewport({
      width: 924,
      height: 412,
      screenBorderRadius: 36,
      safeArea: safeArea(0, 0, 0, 58),
      cameras: [cutout('pixel-9-cutout-landscape', 'Camera cutout', 0, 187, 58, 37, 19)],
    }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 21, right: 22, bottom: 21, left: 22 },
      borderRadius: 57,
    }),
    isSystem: true,
    favorite: false,
    tags: ['android', 'pixel'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'samsung-galaxy-s24',
    name: 'Samsung Galaxy S24',
    brand: 'Samsung',
    model: 'Galaxy S24',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'medium',
    userAgent: ANDROID_PHONE_USER_AGENT,
    portrait: viewport({ width: 360, height: 780, screenBorderRadius: 28 }),
    landscape: viewport({ width: 780, height: 360, screenBorderRadius: 28 }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 11, right: 13, bottom: 11, left: 13 },
      borderRadius: 39,
    }),
    isSystem: true,
    favorite: false,
    tags: ['android', 'samsung', 'galaxy'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-air-10-9',
    name: 'iPad Air 10.9-inch',
    brand: 'Apple',
    model: 'iPad Air (4th and 5th generation)',
    category: 'tablet',
    devicePixelRatio: 2,
    confidence: 'medium',
    userAgent: IPAD_USER_AGENT,
    portrait: viewport({ width: 820, height: 1180, screenBorderRadius: 20 }),
    landscape: viewport({ width: 1180, height: 820, screenBorderRadius: 20 }),
    frame: hardwareFrame({
      housingToActiveArea: uniformInsets(52),
      borderRadius: 72,
      backgroundColor: '#27272a',
      borderColor: '#71717a',
    }),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'ipad', 'tablet', 'air'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11-inch',
    brand: 'Apple',
    model: 'iPad Pro 11-inch (1st to 4th generation)',
    category: 'tablet',
    devicePixelRatio: 2,
    confidence: 'medium',
    userAgent: IPAD_USER_AGENT,
    portrait: viewport({ width: 834, height: 1194, screenBorderRadius: 20 }),
    landscape: viewport({ width: 1194, height: 834, screenBorderRadius: 20 }),
    frame: hardwareFrame({
      housingToActiveArea: uniformInsets(45),
      borderRadius: 65,
      backgroundColor: '#27272a',
      borderColor: '#71717a',
    }),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'ipad', 'tablet', 'pro'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'surface-pro-7',
    name: 'Surface Pro 7',
    brand: 'Microsoft',
    model: 'Surface Pro 7',
    category: 'tablet',
    devicePixelRatio: 2,
    confidence: 'medium',
    userAgent: DESKTOP_USER_AGENT,
    portrait: viewport({ width: 912, height: 1368, screenBorderRadius: 8 }),
    landscape: viewport({ width: 1368, height: 912, screenBorderRadius: 8 }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 84, right: 73, bottom: 84, left: 73 },
      borderRadius: 22,
      backgroundColor: '#27272a',
      borderColor: '#71717a',
    }),
    isSystem: true,
    favorite: false,
    tags: ['windows', 'surface', 'tablet'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'surface-duo-spanned',
    name: 'Surface Duo (spanned)',
    brand: 'Microsoft',
    model: 'Surface Duo (1st generation)',
    category: 'foldable',
    devicePixelRatio: 2.5,
    confidence: 'medium',
    userAgent: ANDROID_PHONE_USER_AGENT,
    portrait: viewport({
      width: 1114,
      height: 720,
      displayFeatures: [hinge('surface-duo-hinge-horizontal', 540, 0, 34, 720)],
    }),
    landscape: viewport({
      width: 720,
      height: 1114,
      displayFeatures: [hinge('surface-duo-hinge-vertical', 0, 540, 720, 34)],
    }),
    frame: hardwareFrame({
      housingToActiveArea: { top: 98, right: 33, bottom: 98, left: 33 },
      borderRadius: 22,
      backgroundColor: '#27272a',
      borderColor: '#71717a',
    }),
    isSystem: true,
    favorite: false,
    tags: ['android', 'surface', 'foldable', 'dual-screen'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    brand: 'Apple',
    model: 'iPhone 15',
    category: 'phone',
    devicePixelRatio: 3,
    confidence: 'high',
    userAgent: IOS_PHONE_USER_AGENT,
    portrait: viewport({
      width: 393,
      height: 852,
      screenBorderRadius: 47,
      safeArea: safeArea(59, 0, 34, 0),
      cameras: [
        cutout('iphone-15-dynamic-island-portrait', 'Dynamic Island', 134, 11, 125, 37, 19),
      ],
    }),
    landscape: viewport({
      width: 852,
      height: 393,
      screenBorderRadius: 47,
      safeArea: safeArea(0, 59, 21, 59),
      cameras: [
        cutout('iphone-15-dynamic-island-landscape', 'Dynamic Island', 11, 134, 37, 125, 19),
      ],
    }),
    frame: modernIphoneFrame(47, 20),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'iphone', 'dynamic-island'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-mini',
    name: 'iPad mini',
    brand: 'Apple',
    model: 'iPad mini (6th generation)',
    category: 'tablet',
    devicePixelRatio: 2,
    confidence: 'medium',
    userAgent: IPAD_USER_AGENT,
    portrait: viewport({ width: 744, height: 1133, screenBorderRadius: 20 }),
    landscape: viewport({ width: 1133, height: 744, screenBorderRadius: 20 }),
    frame: hardwareFrame({
      housingToActiveArea: uniformInsets(56),
      borderRadius: 76,
      backgroundColor: '#27272a',
      borderColor: '#71717a',
    }),
    isSystem: true,
    favorite: false,
    tags: ['ios', 'ipad', 'tablet', 'compact'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'desktop-1280x720',
    name: 'Desktop 1280 × 720',
    brand: 'Generic',
    model: 'Desktop 1280 × 720 reference viewport',
    category: 'desktop',
    devicePixelRatio: 1,
    confidence: 'high',
    userAgent: DESKTOP_USER_AGENT,
    portrait: viewport({ width: 1280, height: 720, screenBorderRadius: 8 }),
    landscape: viewport({ width: 1280, height: 720, screenBorderRadius: 8 }),
    frame: desktopFrame(),
    isSystem: true,
    favorite: false,
    tags: ['desktop', 'reference', 'hd'],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'desktop-1440x900',
    name: 'Desktop 1440 × 900',
    brand: 'Generic',
    model: 'Desktop 1440 × 900 reference viewport',
    category: 'desktop',
    devicePixelRatio: 1,
    confidence: 'high',
    userAgent: DESKTOP_USER_AGENT,
    portrait: viewport({ width: 1440, height: 900, screenBorderRadius: 8 }),
    landscape: viewport({ width: 1440, height: 900, screenBorderRadius: 8 }),
    frame: desktopFrame(),
    isSystem: true,
    favorite: false,
    tags: ['desktop', 'reference', 'wide'],
    createdAt: 0,
    updatedAt: 0,
  },
] satisfies DeviceProfile[];

export const SYSTEM_DEVICES: DeviceProfile[] = DEFAULT_DEVICES;

export const DEFAULT_DEVICE_ID = 'iphone-15-pro';

export default DEFAULT_DEVICES;
