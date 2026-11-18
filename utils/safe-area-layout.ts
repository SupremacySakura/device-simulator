import type { DeviceViewport } from '../types/device';

export interface DeviceContentRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getDeviceContentRect(viewport: DeviceViewport): DeviceContentRect {
  const { safeArea } = viewport;
  return {
    x: safeArea.left,
    y: safeArea.top,
    width: Math.max(0, viewport.width - safeArea.left - safeArea.right),
    height: Math.max(0, viewport.height - safeArea.top - safeArea.bottom),
  };
}
