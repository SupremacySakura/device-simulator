export const MIN_AUTO_SCALE = 0.25;
export const MAX_AUTO_SCALE = 1.5;
export const MIN_MANUAL_SCALE = 0.1;
export const MAX_MANUAL_SCALE = 3;
export const MANUAL_SCALE_STEP = 0.1;

export interface AutoScaleOptions {
  minScale?: number;
  maxScale?: number;
  padding?: number;
}

export interface AutoScaleInput extends AutoScaleOptions {
  availableWidth: number;
  availableHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface ScaledSize {
  width: number;
  height: number;
}

function requirePositiveFinite(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${field} must be a finite number greater than zero.`);
  }
}

function normalizeInput(
  inputOrAvailableWidth: AutoScaleInput | number,
  availableHeight?: number,
  contentWidth?: number,
  contentHeight?: number,
  options: AutoScaleOptions = {},
): AutoScaleInput {
  if (typeof inputOrAvailableWidth === 'object') {
    return inputOrAvailableWidth;
  }

  if (availableHeight === undefined || contentWidth === undefined || contentHeight === undefined) {
    throw new TypeError('All auto-scale dimensions are required.');
  }

  return {
    availableWidth: inputOrAvailableWidth,
    availableHeight,
    contentWidth,
    contentHeight,
    ...options,
  };
}

export function clampScale(
  scale: number,
  minScale = MIN_AUTO_SCALE,
  maxScale = MAX_AUTO_SCALE,
): number {
  requirePositiveFinite(scale, 'scale');
  requirePositiveFinite(minScale, 'minScale');
  requirePositiveFinite(maxScale, 'maxScale');

  if (minScale > maxScale) {
    throw new RangeError('minScale cannot be greater than maxScale.');
  }

  return Math.min(maxScale, Math.max(minScale, scale));
}

export function isManualScale(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_MANUAL_SCALE &&
    value <= MAX_MANUAL_SCALE
  );
}

export function clampManualScale(scale: number): number {
  return clampScale(scale, MIN_MANUAL_SCALE, MAX_MANUAL_SCALE);
}

export function stepManualScale(
  current: number,
  direction: -1 | 1,
  step = MANUAL_SCALE_STEP,
): number {
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError('step must be a finite number greater than zero.');
  }
  return Math.round(clampManualScale(current + direction * step) * 100) / 100;
}

export function calculateAutoScale(input: AutoScaleInput): number;
export function calculateAutoScale(
  availableWidth: number,
  availableHeight: number,
  contentWidth: number,
  contentHeight: number,
  options?: AutoScaleOptions,
): number;
export function calculateAutoScale(
  inputOrAvailableWidth: AutoScaleInput | number,
  availableHeight?: number,
  contentWidth?: number,
  contentHeight?: number,
  options: AutoScaleOptions = {},
): number {
  const input = normalizeInput(
    inputOrAvailableWidth,
    availableHeight,
    contentWidth,
    contentHeight,
    options,
  );
  const {
    availableWidth,
    availableHeight: availableHeightValue,
    contentWidth: contentWidthValue,
    contentHeight: contentHeightValue,
    minScale = MIN_AUTO_SCALE,
    maxScale = MAX_AUTO_SCALE,
    padding = 0,
  } = input;

  requirePositiveFinite(availableWidth, 'availableWidth');
  requirePositiveFinite(availableHeightValue, 'availableHeight');
  requirePositiveFinite(contentWidthValue, 'contentWidth');
  requirePositiveFinite(contentHeightValue, 'contentHeight');

  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError('padding must be a finite, non-negative number.');
  }

  const usableWidth = availableWidth - padding * 2;
  const usableHeight = availableHeightValue - padding * 2;

  if (usableWidth <= 0 || usableHeight <= 0) {
    return clampScale(minScale, minScale, maxScale);
  }

  const fitScale = Math.min(usableWidth / contentWidthValue, usableHeight / contentHeightValue);

  return clampScale(fitScale, minScale, maxScale);
}

export function getScaledSize(width: number, height: number, scale: number): ScaledSize {
  requirePositiveFinite(width, 'width');
  requirePositiveFinite(height, 'height');
  requirePositiveFinite(scale, 'scale');

  return {
    width: width * scale,
    height: height * scale,
  };
}

export const computeAutoScale = calculateAutoScale;
