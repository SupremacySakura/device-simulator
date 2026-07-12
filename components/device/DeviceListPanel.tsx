import { Download, Plus, Upload } from 'lucide-react';
import { useMemo } from 'react';
import { useDeviceStore } from '../../stores/device-store';
import { useHistoryStore } from '../../stores/history-store';
import type { DeviceProfile } from '../../types/device';
import { Button } from '../common/Button';
import { DeviceCategoryTabs } from './DeviceCategoryTabs';
import { DeviceList } from './DeviceList';
import { DeviceSearch } from './DeviceSearch';

interface DeviceListPanelProps {
  onAdd: () => void;
  onEdit: (device: DeviceProfile) => void;
  onDuplicate: (device: DeviceProfile) => void;
  onExport: (device: DeviceProfile) => void;
  onDelete: (device: DeviceProfile) => void;
  onImportExport: () => void;
}

export function DeviceListPanel({
  onAdd,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onImportExport,
}: DeviceListPanelProps) {
  const store = useDeviceStore();
  const recordDevice = useHistoryStore((state) => state.recordDevice);

  const filtered = useMemo(() => {
    const query = store.searchQuery.trim().toLocaleLowerCase();
    return store.devices.filter((device) => {
      const categoryMatches =
        store.categoryFilter === 'all' ||
        (store.categoryFilter === 'custom'
          ? !device.isSystem
          : device.category === store.categoryFilter);
      const searchMatches =
        !query ||
        `${device.name} ${device.brand ?? ''} ${device.model ?? ''} ${device.tags.join(' ')}`
          .toLocaleLowerCase()
          .includes(query);
      return categoryMatches && searchMatches;
    });
  }, [store.categoryFilter, store.devices, store.searchQuery]);

  const favorites = filtered.filter((device) => device.favorite);
  const systemDevices = filtered.filter((device) => device.isSystem && !device.favorite);
  const customDevices = filtered.filter((device) => !device.isSystem && !device.favorite);

  const select = (id: string) => {
    store.setCurrentDevice(id);
    recordDevice(id);
  };

  return (
    <aside className="flex h-full w-[268px] shrink-0 flex-col border-r border-[#e7e7ec] bg-white">
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#202127]">设备列表</h2>
            <p className="mt-0.5 text-[11px] text-[#8b8d96]">{store.devices.length} 个可用配置</p>
          </div>
          <Button
            className="!size-8 !px-0"
            aria-label="添加设备"
            title="添加自定义设备"
            onClick={onAdd}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <DeviceSearch value={store.searchQuery} onChange={store.setSearchQuery} />
        <div className="mt-3">
          <DeviceCategoryTabs value={store.categoryFilter} onChange={store.setCategoryFilter} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-3">
        <div className="grid gap-2">
          {favorites.length > 0 ? (
            <DeviceList
              title="收藏"
              favoriteSection
              devices={favorites}
              currentDeviceId={store.currentDeviceId}
              onSelect={select}
              onFavorite={store.toggleFavorite}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onExport={onExport}
              onDelete={onDelete}
            />
          ) : null}
          {systemDevices.length > 0 ? (
            <DeviceList
              title="系统设备"
              devices={systemDevices}
              currentDeviceId={store.currentDeviceId}
              onSelect={select}
              onFavorite={store.toggleFavorite}
              onEdit={onEdit}
              onDuplicate={onDuplicate}
              onExport={onExport}
              onDelete={onDelete}
            />
          ) : null}
          <DeviceList
            title="自定义设备"
            devices={customDevices}
            currentDeviceId={store.currentDeviceId}
            onSelect={select}
            onFavorite={store.toggleFavorite}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onExport={onExport}
            onDelete={onDelete}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-[#ececf0] bg-[#fafafd] p-3">
        <Button fullWidth variant="primary" className="mb-2" onClick={onAdd}>
          <Plus className="size-4" /> 添加设备
        </Button>
        <Button fullWidth onClick={onImportExport}>
          <Upload className="size-4" /> 导入 <span className="text-[#a1a3ab]">/</span>{' '}
          <Download className="size-4" /> 导出
        </Button>
      </div>
    </aside>
  );
}
