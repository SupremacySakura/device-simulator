import { CopyPlus, MonitorSmartphone, Plus, Smartphone, Star } from 'lucide-react';
import { useMemo, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
import type { DeviceCategoryFilter } from '../../stores/device-store';
import type { DeviceOrientation, DeviceProfile } from '../../types/device';
import { IconButton } from '../common/IconButton';
import { DeviceCategoryTabs } from '../device/DeviceCategoryTabs';
import { DeviceSearch } from '../device/DeviceSearch';

export const COMPARE_DEVICE_DRAG_TYPE = 'application/x-device-simulator-profile';

interface CompareDeviceLibraryProps {
  devices: readonly DeviceProfile[];
  recentDeviceIds: readonly string[];
  addedCounts: Readonly<Record<string, number>>;
  query: string;
  category: DeviceCategoryFilter;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: DeviceCategoryFilter) => void;
  onAdd: (deviceId: string, orientation?: DeviceOrientation, copies?: number) => void;
  onToggleFavorite: (deviceId: string) => void;
  showFilters?: boolean;
}

function matchesDevice(device: DeviceProfile, query: string, category: DeviceCategoryFilter) {
  const categoryMatches =
    category === 'all' || (category === 'custom' ? !device.isSystem : device.category === category);
  if (!categoryMatches) return false;
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return `${device.name} ${device.brand ?? ''} ${device.model ?? ''} ${device.tags.join(' ')}`
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function DeviceItem({
  device,
  addedCount,
  onAdd,
  onToggleFavorite,
}: {
  device: DeviceProfile;
  addedCount: number;
  onAdd: CompareDeviceLibraryProps['onAdd'];
  onToggleFavorite: CompareDeviceLibraryProps['onToggleFavorite'];
}) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(COMPARE_DEVICE_DRAG_TYPE, device.id);
    event.dataTransfer.setData('text/plain', device.id);
  };

  const addPortrait = (event: MouseEvent) => {
    event.stopPropagation();
    onAdd(device.id, 'portrait');
  };

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      aria-label={`添加 ${device.name} 竖屏实例`}
      data-device-library-id={device.id}
      className="group flex cursor-copy items-center gap-2 rounded-xl border border-transparent px-2 py-2 transition hover:border-[#ddd7ff] hover:bg-[#f7f5ff]"
      title="点击添加；也可拖到画布指定位置"
      onDragStart={handleDragStart}
      onClick={(event) => {
        if (event.detail === 1) onAdd(device.id, 'portrait');
      }}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onAdd(device.id, 'portrait');
      }}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f0edff] text-[#6045df]">
        {device.category === 'desktop' ? (
          <MonitorSmartphone className="size-[18px]" />
        ) : (
          <Smartphone className="size-[18px]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-[#303139]">{device.name}</span>
          {addedCount > 0 ? (
            <span className="shrink-0 rounded-full bg-[#e9e4ff] px-1.5 py-0.5 text-[9px] font-bold text-[#5d3df0]">
              {addedCount}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[10px] text-[#858790]">
          {device.portrait.width} × {device.portrait.height}
        </p>
      </div>
      <div className="flex shrink-0 items-center opacity-70 transition group-hover:opacity-100">
        <IconButton
          label={device.favorite ? '取消收藏' : '收藏设备'}
          size="sm"
          active={device.favorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(device.id);
          }}
        >
          <Star className={`size-3.5 ${device.favorite ? 'fill-current' : ''}`} />
        </IconButton>
        <IconButton label="添加竖屏" size="sm" onClick={addPortrait}>
          <Plus className="size-3.5" />
        </IconButton>
        <IconButton
          label="添加横屏"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(device.id, 'landscape');
          }}
        >
          <MonitorSmartphone className="size-3.5" />
        </IconButton>
        <IconButton
          label="添加三个副本"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(device.id, 'portrait', 3);
          }}
        >
          <CopyPlus className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function DeviceSection({
  title,
  devices,
  ...props
}: {
  title: string;
  devices: readonly DeviceProfile[];
  addedCounts: CompareDeviceLibraryProps['addedCounts'];
  onAdd: CompareDeviceLibraryProps['onAdd'];
  onToggleFavorite: CompareDeviceLibraryProps['onToggleFavorite'];
}) {
  if (devices.length === 0) return null;
  return (
    <section className="mb-3" aria-label={title}>
      <h3 className="mb-1 px-2 text-[11px] font-semibold tracking-wide text-[#777984]">{title}</h3>
      <div className="grid gap-0.5">
        {devices.map((device) => (
          <DeviceItem
            key={device.id}
            device={device}
            addedCount={props.addedCounts[device.id] ?? 0}
            onAdd={props.onAdd}
            onToggleFavorite={props.onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}

export function CompareDeviceLibrary({
  devices,
  recentDeviceIds,
  addedCounts,
  query,
  category,
  onQueryChange,
  onCategoryChange,
  onAdd,
  onToggleFavorite,
  showFilters = true,
}: CompareDeviceLibraryProps) {
  const groups = useMemo(() => {
    const filtered = devices.filter((device) => matchesDevice(device, query, category));
    const recentOrder = new Map(recentDeviceIds.map((id, index) => [id, index]));
    const recent = filtered
      .filter((device) => recentOrder.has(device.id))
      .sort((a, b) => (recentOrder.get(a.id) ?? 99) - (recentOrder.get(b.id) ?? 99));
    const recentSet = new Set(recent.map((device) => device.id));
    const favorites = filtered.filter((device) => device.favorite && !recentSet.has(device.id));
    const groupedSet = new Set([...recentSet, ...favorites.map((device) => device.id)]);
    return {
      recent,
      favorites,
      systems: filtered.filter((device) => device.isSystem && !groupedSet.has(device.id)),
      customs: filtered.filter((device) => !device.isSystem && !groupedSet.has(device.id)),
      count: filtered.length,
    };
  }, [category, devices, query, recentDeviceIds]);

  return (
    <>
      {showFilters ? (
        <div className="grid gap-3">
          <DeviceSearch value={query} onChange={onQueryChange} />
          <DeviceCategoryTabs value={category} onChange={onCategoryChange} />
        </div>
      ) : null}
      <div className={showFilters ? 'mt-4' : ''}>
        {groups.count === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dedee5] px-4 py-8 text-center text-xs text-[#858790]">
            没有匹配的设备
          </div>
        ) : (
          <>
            <DeviceSection
              title="最近使用"
              devices={groups.recent}
              addedCounts={addedCounts}
              onAdd={onAdd}
              onToggleFavorite={onToggleFavorite}
            />
            <DeviceSection
              title="收藏"
              devices={groups.favorites}
              addedCounts={addedCounts}
              onAdd={onAdd}
              onToggleFavorite={onToggleFavorite}
            />
            <DeviceSection
              title="系统设备"
              devices={groups.systems}
              addedCounts={addedCounts}
              onAdd={onAdd}
              onToggleFavorite={onToggleFavorite}
            />
            <DeviceSection
              title="自定义设备"
              devices={groups.customs}
              addedCounts={addedCounts}
              onAdd={onAdd}
              onToggleFavorite={onToggleFavorite}
            />
          </>
        )}
      </div>
    </>
  );
}
