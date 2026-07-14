import { PanelLeftClose, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { DeviceCategoryFilter } from '../../stores/device-store';
import type { DeviceOrientation, DeviceProfile } from '../../types/device';
import { Button } from '../common/Button';
import { IconButton } from '../common/IconButton';
import { CompareDeviceLibrary } from './CompareDeviceLibrary';

interface CompareSidebarProps {
  devices: readonly DeviceProfile[];
  recentDeviceIds: readonly string[];
  addedCounts: Readonly<Record<string, number>>;
  instanceCount: number;
  onAdd: (deviceId: string, orientation?: DeviceOrientation, copies?: number) => void;
  onOpenAddDialog: () => void;
  onToggleFavorite: (deviceId: string) => void;
  onCollapse: () => void;
}

export function CompareSidebar({
  devices,
  recentDeviceIds,
  addedCounts,
  instanceCount,
  onAdd,
  onOpenAddDialog,
  onToggleFavorite,
  onCollapse,
}: CompareSidebarProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DeviceCategoryFilter>('all');

  return (
    <aside
      id="compare-device-library"
      aria-label="对比设备库"
      className="flex h-full w-[284px] shrink-0 flex-col border-r border-[#e7e7ec] bg-white"
    >
      <div className="shrink-0 px-4 pt-5 pb-3">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#202127]">设备库</h2>
            <p className="mt-0.5 text-[11px] text-[#858790]">
              已添加 {instanceCount} 个 · 可重复添加
            </p>
          </div>
          <div className="flex items-center gap-1">
            <IconButton
              label="收起设备库"
              size="sm"
              aria-controls="compare-device-library"
              aria-expanded="true"
              className="max-[960px]:hidden"
              onClick={onCollapse}
            >
              <PanelLeftClose className="size-4" />
            </IconButton>
            <IconButton label="打开添加设备面板" size="sm" onClick={onOpenAddDialog}>
              <Plus className="size-4" />
            </IconButton>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <CompareDeviceLibrary
          devices={devices}
          recentDeviceIds={recentDeviceIds}
          addedCounts={addedCounts}
          query={query}
          category={category}
          onQueryChange={setQuery}
          onCategoryChange={setCategory}
          onAdd={onAdd}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
      <div className="shrink-0 border-t border-[#ececf0] bg-[#fafafd] p-3">
        <Button fullWidth variant="primary" onClick={onOpenAddDialog}>
          <Sparkles className="size-4" /> 添加设备或组合
        </Button>
        <p className="mt-2 text-center text-[10px] leading-4 text-[#8b8d96]">
          提示：可将设备项拖到画布指定位置
        </p>
      </div>
    </aside>
  );
}
