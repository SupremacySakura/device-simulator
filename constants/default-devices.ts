import type { DeviceProfile, DeviceViewport, SafeAreaInsets } from '../types/device';

const ZERO_SAFE_AREA: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function safeArea(top: number, right: number, bottom: number, left: number): SafeAreaInsets {
  return { top, right, bottom, left };
}

function viewport(
  width: number,
  height: number,
  insets: SafeAreaInsets = ZERO_SAFE_AREA,
): DeviceViewport {
  return { width, height, safeArea: { ...insets } };
}

/**
 * 系统设备：只读预设。视口为真实 CSS 像素，安全区取自厂商公开规范。
 * 横屏安全区为竖屏值逆时针旋转（top→right, right→bottom, bottom→left, left→top）。
 */
export const SYSTEM_DEVICES: DeviceProfile[] = [
  {
    id: 'iphone-se-3rd-generation',
    name: 'iPhone SE (3rd generation)',
    category: 'phone',
    devicePixelRatio: 2,
    portrait: viewport(375, 667),
    landscape: viewport(667, 375),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-15',
    name: 'iPhone 15',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: viewport(393, 852, safeArea(59, 0, 34, 0)),
    landscape: viewport(852, 393, safeArea(0, 59, 0, 34)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-15-pro-max',
    name: 'iPhone 15 Pro Max',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: viewport(430, 932, safeArea(59, 0, 34, 0)),
    landscape: viewport(932, 430, safeArea(0, 59, 0, 34)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: viewport(402, 874, safeArea(62, 0, 34, 0)),
    landscape: viewport(874, 402, safeArea(0, 62, 0, 34)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'google-pixel-8',
    name: 'Pixel 8',
    category: 'phone',
    devicePixelRatio: 2.625,
    portrait: viewport(412, 915, safeArea(24, 0, 16, 0)),
    landscape: viewport(915, 412, safeArea(0, 24, 0, 16)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'google-pixel-9',
    name: 'Pixel 9',
    category: 'phone',
    devicePixelRatio: 2.625,
    portrait: viewport(412, 924, safeArea(24, 0, 16, 0)),
    landscape: viewport(924, 412, safeArea(0, 24, 0, 16)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'samsung-galaxy-s24',
    name: 'Galaxy S24',
    category: 'phone',
    devicePixelRatio: 3,
    portrait: viewport(360, 780, safeArea(24, 0, 16, 0)),
    landscape: viewport(780, 360, safeArea(0, 24, 0, 16)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-mini',
    name: 'iPad mini',
    category: 'tablet',
    devicePixelRatio: 2,
    portrait: viewport(744, 1133, safeArea(24, 0, 20, 0)),
    landscape: viewport(1133, 744, safeArea(0, 24, 0, 20)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-air-10-9',
    name: 'iPad Air',
    category: 'tablet',
    devicePixelRatio: 2,
    portrait: viewport(820, 1180, safeArea(24, 0, 20, 0)),
    landscape: viewport(1180, 820, safeArea(0, 24, 0, 20)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'ipad-pro-11',
    name: 'iPad Pro 11"',
    category: 'tablet',
    devicePixelRatio: 2,
    portrait: viewport(834, 1194, safeArea(24, 0, 20, 0)),
    landscape: viewport(1194, 834, safeArea(0, 24, 0, 20)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'surface-pro-7',
    name: 'Surface Pro 7',
    category: 'tablet',
    devicePixelRatio: 2,
    portrait: viewport(912, 1368, safeArea(0, 0, 0, 0)),
    landscape: viewport(1368, 912, safeArea(0, 0, 0, 0)),
    isSystem: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

export const DEFAULT_DEVICE_ID = SYSTEM_DEVICES[0]?.id ?? '';
