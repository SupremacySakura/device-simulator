import type { DeviceCamera, DeviceProfile, DisplayFeature } from '../types/device';

export type CameraTemplateId =
  'circle-center' | 'circle-left' | 'pill' | 'dynamic-island' | 'custom-rect';

export const CAMERA_TEMPLATES: ReadonlyArray<{
  id: CameraTemplateId;
  label: string;
  description: string;
}> = [
  { id: 'circle-center', label: '居中圆形摄像头', description: '顶部居中的 12px 圆孔' },
  { id: 'circle-left', label: '左上角挖孔', description: '适合 Android 设备的圆孔' },
  { id: 'pill', label: '胶囊形挖孔', description: '居中的短胶囊区域' },
  { id: 'dynamic-island', label: '灵动岛', description: '141 × 37 的顶部岛形区域' },
  { id: 'custom-rect', label: '自定义矩形', description: '可继续编辑尺寸和形状' },
];

export function createCameraFromTemplate(template: CameraTemplateId): DeviceCamera {
  const id = crypto.randomUUID();
  const shared = {
    id,
    layoutMode: 'overlay' as const,
    visible: true,
    rotation: 0,
    style: { backgroundColor: '#050507', borderColor: '#15151a', borderWidth: 0, opacity: 1 },
  };
  switch (template) {
    case 'circle-center':
      return {
        ...shared,
        name: '居中圆形摄像头',
        position: {
          mode: 'anchor',
          horizontal: 'center',
          vertical: 'top',
          offsetX: 0,
          offsetY: 12,
        },
        width: 12,
        height: 12,
        shape: 'circle',
        borderRadius: 999,
      };
    case 'circle-left':
      return {
        ...shared,
        name: '左上角挖孔',
        position: { mode: 'anchor', horizontal: 'left', vertical: 'top', offsetX: 20, offsetY: 18 },
        width: 14,
        height: 14,
        shape: 'circle',
        borderRadius: 999,
      };
    case 'pill':
      return {
        ...shared,
        name: '胶囊形挖孔',
        position: {
          mode: 'anchor',
          horizontal: 'center',
          vertical: 'top',
          offsetX: 0,
          offsetY: 12,
        },
        width: 72,
        height: 24,
        shape: 'rounded-rect',
        borderRadius: 14,
      };
    case 'dynamic-island':
      return {
        ...shared,
        name: '灵动岛区域',
        position: {
          mode: 'anchor',
          horizontal: 'center',
          vertical: 'top',
          offsetX: 0,
          offsetY: 11,
        },
        width: 141,
        height: 37,
        shape: 'rounded-rect',
        borderRadius: 20,
      };
    case 'custom-rect':
      return {
        ...shared,
        name: '自定义矩形',
        position: { mode: 'absolute', x: 16, y: 16 },
        width: 80,
        height: 28,
        shape: 'rect',
        borderRadius: 0,
      };
  }
}

export function createHomeIndicator(viewportWidth: number, viewportHeight: number): DisplayFeature {
  const width = Math.min(135, Math.max(80, viewportWidth * 0.34));
  return {
    id: crypto.randomUUID(),
    name: 'Home Indicator',
    type: 'home-indicator',
    x: (viewportWidth - width) / 2,
    y: Math.max(0, viewportHeight - 15),
    width,
    height: 5,
    borderRadius: 3,
    rotation: 0,
    visible: true,
    style: { backgroundColor: '#050507', opacity: 1 },
  };
}

export function exportFilename(device?: DeviceProfile): string {
  const base = device
    ? device.name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    : 'devices';
  return `device-simulator-${base}-${new Date().toISOString().slice(0, 10)}.json`;
}
