import type { CompareDeviceInstance } from '../types/compare';
import type { DeviceFrameConfig, DeviceProfile } from '../types/device';

const FRAME_DISABLED: DeviceFrameConfig = {
  enabled: false,
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  borderRadius: 0,
  backgroundColor: '#000000',
  borderColor: '#000000',
  borderWidth: 0,
  shadowEnabled: false,
};

export function createCompareProfile(
  id: string,
  portraitWidth: number,
  portraitHeight: number,
  frame: DeviceFrameConfig = FRAME_DISABLED,
): DeviceProfile {
  const viewport = (width: number, height: number) => ({
    width,
    height,
    screenBorderRadius: 0,
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    cameras: [],
    displayFeatures: [],
  });

  return {
    id,
    name: id,
    category: 'custom',
    devicePixelRatio: 1,
    portrait: viewport(portraitWidth, portraitHeight),
    landscape: viewport(portraitHeight, portraitWidth),
    frame: {
      ...frame,
      insets: { ...frame.insets },
    },
    isSystem: false,
    favorite: false,
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  };
}

export function createCompareInstance(
  id: string,
  deviceId: string,
  overrides: Partial<CompareDeviceInstance> = {},
): CompareDeviceInstance {
  return {
    id,
    deviceId,
    url: 'https://example.com/',
    orientation: 'portrait',
    scale: 1,
    position: { x: 0, y: 0 },
    safeAreaVisible: true,
    cameraVisible: true,
    displayFeaturesVisible: true,
    frameVisible: true,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}
