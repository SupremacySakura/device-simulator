export type DeviceCategory = 'phone' | 'tablet' | 'custom';

export type DeviceOrientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DeviceViewport {
  width: number;
  height: number;
  safeArea: SafeAreaInsets;
  /** 屏幕圆角半径，仅用于视觉呈现。 */
  screenRadius?: number;
}

export interface DeviceProfile {
  id: string;
  name: string;
  category: DeviceCategory;
  devicePixelRatio: number;
  portrait: DeviceViewport;
  landscape: DeviceViewport;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}
