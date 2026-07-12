import { ChevronDown, Star } from 'lucide-react';
import type { DeviceProfile } from '../../types/device';
import { EmptyState } from '../common/StatusState';
import { DeviceListItem } from './DeviceListItem';

interface DeviceListProps {
  title: string;
  devices: DeviceProfile[];
  currentDeviceId: string;
  favoriteSection?: boolean;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onEdit: (device: DeviceProfile) => void;
  onDuplicate: (device: DeviceProfile) => void;
  onExport: (device: DeviceProfile) => void;
  onDelete: (device: DeviceProfile) => void;
}

export function DeviceList({
  title,
  devices,
  currentDeviceId,
  favoriteSection = false,
  onSelect,
  onFavorite,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: DeviceListProps) {
  return (
    <section>
      <div className="flex h-9 items-center gap-2 px-1 text-sm font-semibold text-[#303139]">
        {favoriteSection ? <Star className="size-4 fill-[#f4b51c] text-[#f4b51c]" /> : null}
        <span>{title}</span>
        <span className="ml-auto text-xs font-normal text-[#989aa2]">{devices.length}</span>
        <ChevronDown className="size-3.5 text-[#777981]" />
      </div>
      <div className="grid gap-1">
        {devices.map((device) => (
          <DeviceListItem
            key={device.id}
            device={device}
            active={device.id === currentDeviceId}
            onSelect={() => onSelect(device.id)}
            onFavorite={() => onFavorite(device.id)}
            onEdit={() => onEdit(device)}
            onDuplicate={() => onDuplicate(device)}
            onExport={() => onExport(device)}
            onDelete={() => onDelete(device)}
          />
        ))}
        {devices.length === 0 ? (
          <EmptyState compact title="没有匹配的设备" description="尝试清除搜索或切换设备分类。" />
        ) : null}
      </div>
    </section>
  );
}
