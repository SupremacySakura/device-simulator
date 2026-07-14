import type {
  AlignmentAction,
  CanvasPosition,
  CompareDeviceInstance,
  CompareInstancePositions,
} from '../types/compare';
import type { DeviceProfile } from '../types/device';
import { calculateInstancesBounds } from './canvas-bounds';
import { getInstanceBoundsOrFallback, type InstanceBounds } from './instance-size';

type DeviceProfileMap = Readonly<Record<string, DeviceProfile>>;

interface AlignmentItem {
  instance: CompareDeviceInstance;
  bounds: InstanceBounds;
}

function createItems(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
): AlignmentItem[] {
  const items: AlignmentItem[] = [];
  for (const instance of instances) {
    const profile = profiles[instance.deviceId];
    items.push({ instance, bounds: getInstanceBoundsOrFallback(instance, profile) });
  }
  return items;
}

function originalPositions(items: readonly AlignmentItem[]): Record<string, CanvasPosition> {
  return Object.fromEntries(
    items.map(({ instance }) => [instance.id, { ...instance.position }] as const),
  );
}

function distributeHorizontal(
  items: readonly AlignmentItem[],
  positions: Record<string, CanvasPosition>,
): void {
  const sorted = [...items].sort((first, second) => first.bounds.left - second.bounds.left);
  const left = Math.min(...sorted.map((item) => item.bounds.left));
  const right = Math.max(...sorted.map((item) => item.bounds.right));
  const totalWidth = sorted.reduce((sum, item) => sum + item.bounds.width, 0);
  const gap = (right - left - totalWidth) / (sorted.length - 1);
  let x = left;
  for (const item of sorted) {
    positions[item.instance.id] = { x, y: item.instance.position.y };
    x += item.bounds.width + gap;
  }
}

function distributeVertical(
  items: readonly AlignmentItem[],
  positions: Record<string, CanvasPosition>,
): void {
  const sorted = [...items].sort((first, second) => first.bounds.top - second.bounds.top);
  const top = Math.min(...sorted.map((item) => item.bounds.top));
  const bottom = Math.max(...sorted.map((item) => item.bounds.bottom));
  const totalHeight = sorted.reduce((sum, item) => sum + item.bounds.height, 0);
  const gap = (bottom - top - totalHeight) / (sorted.length - 1);
  let y = top;
  for (const item of sorted) {
    positions[item.instance.id] = { x: item.instance.position.x, y };
    y += item.bounds.height + gap;
  }
}

/** Calculates alignment positions for the supplied (normally selected) instances. */
export function calculateAlignment(
  instances: readonly CompareDeviceInstance[],
  profiles: DeviceProfileMap,
  action: AlignmentAction,
): CompareInstancePositions {
  const items = createItems(instances, profiles);
  const positions = originalPositions(items);
  if (items.length < 2) return positions;
  if (
    items.length < 3 &&
    (action === 'distribute-horizontal' || action === 'distribute-vertical')
  ) {
    return positions;
  }

  if (action === 'distribute-horizontal') {
    distributeHorizontal(items, positions);
    return positions;
  }
  if (action === 'distribute-vertical') {
    distributeVertical(items, positions);
    return positions;
  }

  const bounds = calculateInstancesBounds(
    items.map((item) => item.instance),
    profiles,
  );
  if (!bounds) return positions;

  for (const item of items) {
    const current = item.instance.position;
    if (action === 'align-left') {
      positions[item.instance.id] = { x: bounds.left, y: current.y };
    } else if (action === 'align-right') {
      positions[item.instance.id] = { x: bounds.right - item.bounds.width, y: current.y };
    } else if (action === 'align-top') {
      positions[item.instance.id] = { x: current.x, y: bounds.top };
    } else if (action === 'align-bottom') {
      positions[item.instance.id] = { x: current.x, y: bounds.bottom - item.bounds.height };
    } else if (action === 'align-horizontal-center') {
      positions[item.instance.id] = {
        x: bounds.left + (bounds.width - item.bounds.width) / 2,
        y: current.y,
      };
    } else {
      positions[item.instance.id] = {
        x: current.x,
        y: bounds.top + (bounds.height - item.bounds.height) / 2,
      };
    }
  }

  return positions;
}
