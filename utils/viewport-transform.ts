import type { DeviceOrientation, DeviceProfile, DeviceViewport } from '../types/device';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const AUTO_ZOOM_PADDING = 32;

export interface WindowSize {
  width: number;
  height: number;
}

export interface EmulationMetrics {
  width: number;
  height: number;
  deviceScaleFactor: number;
  scale: number;
  mobile: boolean;
  screenOrientation: { type: 'portraitPrimary' | 'landscapePrimary'; angle: number };
}

export interface SafeAreaInsetsOverride {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function getOrientedViewport(
  device: DeviceProfile,
  orientation: DeviceOrientation,
): DeviceViewport {
  return orientation === 'portrait' ? device.portrait : device.landscape;
}

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) throw new RangeError('scale 必须是有限数字。');
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
}

/** 自动缩放：让设备完整落在窗口内，留出固定边距。 */
export function calculateAutoZoom(viewport: DeviceViewport, windowSize: WindowSize): number {
  const usableWidth = windowSize.width - AUTO_ZOOM_PADDING * 2;
  const usableHeight = windowSize.height - AUTO_ZOOM_PADDING * 2;
  if (usableWidth <= 0 || usableHeight <= 0) return MIN_ZOOM;
  const fit = Math.min(usableWidth / viewport.width, usableHeight / viewport.height);
  return clampZoom(Math.min(1, fit));
}

export function resolveZoom(
  viewport: DeviceViewport,
  windowSize: WindowSize,
  zoomMode: 'auto' | 'manual',
  manualScale: number,
): number {
  return zoomMode === 'auto' ? calculateAutoZoom(viewport, windowSize) : clampZoom(manualScale);
}

/**
 * 生成 CDP Emulation.setDeviceMetricsOverride 所需的参数。
 * 注意：scale 只影响渲染结果，不改变页面内的 CSS 视口宽度。
 */
export function toEmulationMetrics(
  device: DeviceProfile,
  orientation: DeviceOrientation,
  zoom: number,
): EmulationMetrics {
  const viewport = getOrientedViewport(device, orientation);
  return {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: device.devicePixelRatio,
    scale: clampZoom(zoom),
    mobile: device.category !== 'tablet',
    screenOrientation:
      orientation === 'portrait'
        ? { type: 'portraitPrimary', angle: 0 }
        : { type: 'landscapePrimary', angle: 90 },
  };
}

/** 生成 CDP Emulation.setSafeAreaInsetsOverride 参数；零安全区返回 null 表示无需覆盖。 */
export function toSafeAreaOverride(
  device: DeviceProfile,
  orientation: DeviceOrientation,
): SafeAreaInsetsOverride | null {
  const { safeArea } = getOrientedViewport(device, orientation);
  if (safeArea.top === 0 && safeArea.right === 0 && safeArea.bottom === 0 && safeArea.left === 0) {
    return null;
  }
  return { ...safeArea };
}
