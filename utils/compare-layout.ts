import type {
  CanvasPosition,
  CompareAutoLayoutMode,
  CompareDeviceInstance,
  CompareInstancePositions,
} from '../types/compare';
import type { DeviceProfile } from '../types/device';
import { getInstanceVisualSizeOrFallback, type VisualSize } from './instance-size';

type DeviceProfileMap = Readonly<Record<string, DeviceProfile>>;

interface LayoutItem {
  instance: CompareDeviceInstance;
  size: VisualSize;
}

export interface AutoLayoutOptions {
  gap?: number;
  origin?: CanvasPosition;
  columns?: number;
}

const DEFAULT_LAYOUT_GAP = 48;

function resolveOptions(
  options: AutoLayoutOptions,
): Required<Pick<AutoLayoutOptions, 'gap' | 'origin'>> {
  const gap = options.gap ?? DEFAULT_LAYOUT_GAP;
  const origin = options.origin ?? { x: 0, y: 0 };
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError('layout gap must be a finite, non-negative number.');
  }
  if (!Number.isFinite(origin.x) || !Number.isFinite(origin.y)) {
    throw new RangeError('layout origin must contain finite coordinates.');
  }
  return { gap, origin };
}

function createItems(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
): LayoutItem[] {
  const items: LayoutItem[] = [];
  for (const instance of instances) {
    const profile = profiles[instance.deviceId];
    items.push({ instance, size: getInstanceVisualSizeOrFallback(instance, profile) });
  }
  return items;
}

function originalPositions(
  instances: readonly CompareDeviceInstance[],
): Record<string, CanvasPosition> {
  return Object.fromEntries(
    instances.map((instance) => [instance.id, { ...instance.position }] as const),
  );
}

function layoutHorizontal(
  items: readonly LayoutItem[],
  positions: Record<string, CanvasPosition>,
  origin: CanvasPosition,
  gap: number,
): void {
  let x = origin.x;
  for (const item of items) {
    positions[item.instance.id] = { x, y: origin.y };
    x += item.size.width + gap;
  }
}

function layoutVertical(
  items: readonly LayoutItem[],
  positions: Record<string, CanvasPosition>,
  origin: CanvasPosition,
  gap: number,
): void {
  let y = origin.y;
  for (const item of items) {
    positions[item.instance.id] = { x: origin.x, y };
    y += item.size.height + gap;
  }
}

function layoutGrid(
  items: readonly LayoutItem[],
  positions: Record<string, CanvasPosition>,
  origin: CanvasPosition,
  gap: number,
  requestedColumns: number | undefined,
): void {
  if (items.length === 0) return;
  if (
    requestedColumns !== undefined &&
    (!Number.isInteger(requestedColumns) || requestedColumns <= 0)
  ) {
    throw new RangeError('layout columns must be a positive integer.');
  }

  const columns = Math.min(requestedColumns ?? Math.ceil(Math.sqrt(items.length)), items.length);
  const rows = Math.ceil(items.length / columns);
  const columnWidths = Array.from({ length: columns }, () => 0);
  const rowHeights = Array.from({ length: rows }, () => 0);

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    columnWidths[column] = Math.max(columnWidths[column] ?? 0, item.size.width);
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, item.size.height);
  });

  const columnOffsets: number[] = [];
  const rowOffsets: number[] = [];
  let x = origin.x;
  for (const width of columnWidths) {
    columnOffsets.push(x);
    x += width + gap;
  }
  let y = origin.y;
  for (const height of rowHeights) {
    rowOffsets.push(y);
    y += height + gap;
  }

  items.forEach((item, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    positions[item.instance.id] = {
      x: columnOffsets[column] ?? origin.x,
      y: rowOffsets[row] ?? origin.y,
    };
  });
}

/** Calculates stable, non-overlapping positions without mutating instances. */
export function calculateAutoLayout(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
  mode: CompareAutoLayoutMode,
  options: AutoLayoutOptions = {},
): CompareInstancePositions {
  const { gap, origin } = resolveOptions(options);
  const positions = originalPositions(instances);
  const items = createItems(instances, profiles);

  if (mode === 'horizontal') layoutHorizontal(items, positions, origin, gap);
  else if (mode === 'vertical') layoutVertical(items, positions, origin, gap);
  else layoutGrid(items, positions, origin, gap, options.columns);

  return positions;
}
