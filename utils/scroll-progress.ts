export interface ScrollMetrics {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}

export interface ScrollProgress {
  verticalProgress: number;
  horizontalProgress: number;
}

export interface ScrollOffset {
  scrollTop: number;
  scrollLeft: number;
}

export interface ScrollableSize {
  scrollHeight: number;
  scrollWidth: number;
  viewportHeight: number;
  viewportWidth: number;
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number.`);
  }
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) throw new RangeError('scroll progress must be finite.');
  return Math.min(1, Math.max(0, progress));
}

export function calculateAxisScrollProgress(
  offset: number,
  scrollSize: number,
  viewportSize: number,
): number {
  if (!Number.isFinite(offset)) throw new RangeError('scroll offset must be finite.');
  assertNonNegativeFinite(scrollSize, 'scrollSize');
  assertNonNegativeFinite(viewportSize, 'viewportSize');
  const range = Math.max(scrollSize - viewportSize, 0);
  if (range === 0) return 0;
  return clampProgress(offset / range);
}

export function calculateAxisScrollOffset(
  progress: number,
  scrollSize: number,
  viewportSize: number,
): number {
  assertNonNegativeFinite(scrollSize, 'scrollSize');
  assertNonNegativeFinite(viewportSize, 'viewportSize');
  return clampProgress(progress) * Math.max(scrollSize - viewportSize, 0);
}

export function calculateScrollProgress(metrics: ScrollMetrics): ScrollProgress {
  return {
    verticalProgress: calculateAxisScrollProgress(
      metrics.scrollTop,
      metrics.scrollHeight,
      metrics.viewportHeight,
    ),
    horizontalProgress: calculateAxisScrollProgress(
      metrics.scrollLeft,
      metrics.scrollWidth,
      metrics.viewportWidth,
    ),
  };
}

export function calculateScrollOffset(
  progress: ScrollProgress,
  target: ScrollableSize,
): ScrollOffset {
  return {
    scrollTop: calculateAxisScrollOffset(
      progress.verticalProgress,
      target.scrollHeight,
      target.viewportHeight,
    ),
    scrollLeft: calculateAxisScrollOffset(
      progress.horizontalProgress,
      target.scrollWidth,
      target.viewportWidth,
    ),
  };
}
