export type DeviceCategory = 'phone' | 'tablet' | 'desktop' | 'foldable' | 'custom';

export type DeviceOrientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type CameraShape = 'circle' | 'ellipse' | 'rounded-rect' | 'rect';

export type CameraLayoutMode = 'overlay' | 'occupy';

export type CameraPosition =
  | {
      mode: 'absolute';
      x: number;
      y: number;
    }
  | {
      mode: 'anchor';
      horizontal: 'left' | 'center' | 'right';
      vertical: 'top' | 'center' | 'bottom';
      offsetX: number;
      offsetY: number;
    };

export interface DeviceFeatureStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
}

export interface DeviceCamera {
  id: string;
  name: string;
  position: CameraPosition;
  width: number;
  height: number;
  shape: CameraShape;
  borderRadius?: number;
  rotation?: number;
  layoutMode: CameraLayoutMode;
  visible: boolean;
  style?: DeviceFeatureStyle;
}

export type DisplayFeatureType = 'home-indicator' | 'speaker' | 'hinge' | 'custom';

export interface DisplayFeature {
  id: string;
  name: string;
  type: DisplayFeatureType;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius?: number;
  rotation?: number;
  visible: boolean;
  style?: DeviceFeatureStyle;
}

export interface DeviceViewportConfig {
  width: number;
  height: number;
  screenBorderRadius: number;
  safeArea: SafeAreaInsets;
  cameras: DeviceCamera[];
  displayFeatures: DisplayFeature[];
}

export interface DeviceFrameInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DeviceFrameConfig {
  enabled: boolean;
  insets: DeviceFrameInsets;
  borderRadius: number;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  shadowEnabled: boolean;
  shadow?: string;
}

export interface DeviceProfile {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category: DeviceCategory;
  devicePixelRatio: number;
  userAgent?: string;
  portrait: DeviceViewportConfig;
  landscape: DeviceViewportConfig;
  frame: DeviceFrameConfig;
  isSystem: boolean;
  favorite: boolean;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}
