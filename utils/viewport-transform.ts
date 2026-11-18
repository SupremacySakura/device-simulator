import type {
  DeviceOrientation,
  DeviceProfile,
  DeviceViewport,
  SafeAreaInsets,
} from '../types/device';

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3;
export const AUTO_ZOOM_PADDING = 32;
/** 设备外框相对视口的单边留白（机身厚度）。 */
export const FRAME_BEZEL = 12;

export interface WindowSize {
  width: number;
  height: number;
}

export interface DeviceLayout {
  /** iframe 的 CSS 尺寸，必须严格等于设备视口，否则媒体查询会错。 */
  viewport: { width: number; height: number };
  /** 设备外框（含边框留白）的 CSS 尺寸。 */
  frame: { width: number; height: number };
  /** 只作用于外层容器的视觉缩放。 */
  scale: number;
  /** 遮挡层：刘海与 Home Indicator，坐标相对视口左上角。 */
  mask: SafeAreaInsets;
}

export type MaskEdge = 'top' | 'right' | 'bottom' | 'left';

export interface MaskShape {
  kind: 'notch' | 'home';
  edge: MaskEdge;
  /** 垂直于边缘的厚度。 */
  depth: number;
  /** 沿边缘的长度。 */
  length: number;
  /** 从边缘向内缩进的距离，Home Indicator 需要浮在屏幕内。 */
  offset: number;
}

const OPPOSITE_EDGE: Record<MaskEdge, MaskEdge> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

export const NOTCH_MAX_LENGTH = 160;
export const HOME_MAX_LENGTH = 135;
export const HOME_BAR_THICKNESS = 5;

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

/** 自动缩放：让整台设备（含机身留白）完整落在窗口内，不放大超过 100%。 */
export function calculateAutoZoom(viewport: DeviceViewport, windowSize: WindowSize): number {
  const usableWidth = windowSize.width - AUTO_ZOOM_PADDING * 2;
  const usableHeight = windowSize.height - AUTO_ZOOM_PADDING * 2;
  if (usableWidth <= 0 || usableHeight <= 0) return MIN_ZOOM;
  const frameWidth = viewport.width + FRAME_BEZEL * 2;
  const frameHeight = viewport.height + FRAME_BEZEL * 2;
  const fit = Math.min(usableWidth / frameWidth, usableHeight / frameHeight);
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
 * 生成 iframe 布局。关键约束：iframe 的 CSS 尺寸等于设备视口，
 * 缩放只作用于外层 transform，因此媒体查询始终按真实设备宽度求值。
 */
export function toDeviceLayout(
  device: DeviceProfile,
  orientation: DeviceOrientation,
  zoom: number,
): DeviceLayout {
  const viewport = getOrientedViewport(device, orientation);
  return {
    viewport: { width: viewport.width, height: viewport.height },
    frame: {
      width: viewport.width + FRAME_BEZEL * 2,
      height: viewport.height + FRAME_BEZEL * 2,
    },
    scale: clampZoom(zoom),
    mask: { ...viewport.safeArea },
  };
}

/**
 * 把安全区换算成遮挡图形。刘海总是出现在安全区最大的一侧，Home Indicator 在其对面。
 * 这样竖屏（top/bottom）与横屏（right/left）共用同一套几何，不需要各写一份。
 */
export function toMaskShapes(viewport: DeviceViewport): MaskShape[] {
  const { safeArea } = viewport;
  const edges: Array<{ edge: MaskEdge; inset: number }> = [
    { edge: 'top', inset: safeArea.top },
    { edge: 'right', inset: safeArea.right },
    { edge: 'bottom', inset: safeArea.bottom },
    { edge: 'left', inset: safeArea.left },
  ];
  const present = edges.filter((item) => item.inset > 0);
  if (present.length === 0) return [];

  const notchEdge = present.reduce((a, b) => (b.inset > a.inset ? b : a));
  const shortSide = Math.min(viewport.width, viewport.height);
  const homeEdge = OPPOSITE_EDGE[notchEdge.edge];
  const homeInset = edges.find((item) => item.edge === homeEdge)?.inset ?? 0;

  const shapes: MaskShape[] = [
    {
      kind: 'notch',
      edge: notchEdge.edge,
      depth: notchEdge.inset,
      length: Math.min(NOTCH_MAX_LENGTH, shortSide * 0.4),
      offset: 0,
    },
  ];

  if (homeInset > 0) {
    shapes.push({
      kind: 'home',
      edge: homeEdge,
      depth: HOME_BAR_THICKNESS,
      length: Math.min(HOME_MAX_LENGTH, shortSide * 0.34),
      offset: Math.max(6, homeInset - 12),
    });
  }

  return shapes;
}
