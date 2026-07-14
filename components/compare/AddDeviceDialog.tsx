import { LayoutGrid, Plus } from 'lucide-react';
import { useState } from 'react';
import type { DeviceCategoryFilter } from '../../stores/device-store';
import type { DeviceOrientation, DeviceProfile } from '../../types/device';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { CompareDeviceLibrary } from './CompareDeviceLibrary';

export interface ComparePresetGroup {
  id: string;
  name: string;
  description: string;
  deviceIds: readonly string[];
}

interface AddDeviceDialogProps {
  open: boolean;
  devices: readonly DeviceProfile[];
  recentDeviceIds: readonly string[];
  addedCounts: Readonly<Record<string, number>>;
  groups: readonly ComparePresetGroup[];
  onAdd: (deviceId: string, orientation?: DeviceOrientation, copies?: number) => void;
  onAddGroup: (deviceIds: readonly string[]) => void;
  onToggleFavorite: (deviceId: string) => void;
  onClose: () => void;
  replaceMode?: boolean;
}

export function AddDeviceDialog({
  open,
  devices,
  recentDeviceIds,
  addedCounts,
  groups,
  onAdd,
  onAddGroup,
  onToggleFavorite,
  onClose,
  replaceMode = false,
}: AddDeviceDialogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DeviceCategoryFilter>('all');

  return (
    <Modal
      open={open}
      wide
      title={replaceMode ? '更换设备型号' : '添加对比设备'}
      description={
        replaceMode
          ? '实例 ID、URL、位置、缩放和显示设置会保持不变。'
          : '点击设备或将其拖入画布；同一个设备模板可以添加多次。'
      }
      onClose={onClose}
    >
      <div
        className={`grid min-h-[480px] gap-5 ${replaceMode ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_280px]'}`}
      >
        <div className="min-h-0 overflow-y-auto pr-2">
          <CompareDeviceLibrary
            devices={devices}
            recentDeviceIds={recentDeviceIds}
            addedCounts={addedCounts}
            query={query}
            category={category}
            onQueryChange={setQuery}
            onCategoryChange={setCategory}
            onAdd={(deviceId, orientation, copies) => {
              onAdd(deviceId, orientation, copies);
              if ((copies ?? 1) === 1) onClose();
            }}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
        {!replaceMode ? (
          <aside className="rounded-xl border border-[#e4e2ed] bg-[#fafafd] p-3">
            <div className="mb-3 flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-[#ede9ff] text-[#6045df]">
                <LayoutGrid className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#303139]">常用设备组合</h3>
                <p className="text-[10px] text-[#858790]">一次添加多个响应式断点</p>
              </div>
            </div>
            <div className="grid gap-2">
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className="rounded-xl border border-[#e2e2e8] bg-white p-3 text-left transition hover:border-[#cfc5ff] hover:bg-[#f7f5ff]"
                  onClick={() => {
                    onAddGroup(group.deviceIds);
                    onClose();
                  }}
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#303139]">
                    {group.name}
                    <Plus className="size-3.5 text-[#6547f5]" />
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#7d7f88]">
                    {group.description}
                  </span>
                  <span className="mt-2 block text-[10px] font-medium text-[#6547f5]">
                    {group.deviceIds.length} 个设备
                  </span>
                </button>
              ))}
            </div>
            <Button
              fullWidth
              variant="ghost"
              className="mt-3"
              onClick={() => {
                const first = devices[0];
                if (first) onAdd(first.id, 'portrait');
              }}
            >
              <Plus className="size-4" /> 添加第一个可用设备
            </Button>
          </aside>
        ) : null}
      </div>
    </Modal>
  );
}
