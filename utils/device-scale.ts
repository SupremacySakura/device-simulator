export const MIN_MANUAL_SCALE = 0.1;
export const MAX_MANUAL_SCALE = 3;

export function clampManualScale(scale: number): number {
  if (!Number.isFinite(scale)) {
    throw new RangeError('scale 必须是有限数字。');
  }
  return Math.min(MAX_MANUAL_SCALE, Math.max(MIN_MANUAL_SCALE, scale));
}
