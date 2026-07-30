import {
  Copy,
  Download,
  EllipsisVertical,
  Monitor,
  Pencil,
  Smartphone,
  Star,
  Tablet,
  Tablets,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DeviceProfile } from '../../types/device';
import { IconButton } from '../common/IconButton';
import { DeviceConfidenceBadge } from './DeviceConfidenceBadge';

interface DeviceListItemProps {
  device: DeviceProfile;
  active: boolean;
  onSelect: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function DeviceIcon({ device }: { device: DeviceProfile }) {
  if (device.category === 'desktop') return <Monitor className="size-[19px]" />;
  if (device.category === 'tablet') return <Tablet className="size-[19px]" />;
  if (device.category === 'foldable') return <Tablets className="size-[19px]" />;
  return <Smartphone className="size-[19px]" />;
}

export function DeviceListItem({
  device,
  active,
  onSelect,
  onFavorite,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: DeviceListItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const run = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div
      className={`group relative flex min-h-[62px] items-center gap-2 rounded-lg border px-2 py-2 transition-colors ${
        active
          ? 'border-[#ddd5ff] bg-[#f1eeff] text-[#5636ed]'
          : 'border-transparent text-[#3e4048] hover:border-[#ececf0] hover:bg-[#f7f7f9]'
      }`}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        aria-current={active ? 'true' : undefined}
        onClick={onSelect}
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? 'bg-white/80' : 'bg-[#f4f4f7]'}`}
        >
          <DeviceIcon device={device} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{device.name}</span>
            <DeviceConfidenceBadge confidence={device.confidence} compact />
          </span>
          <span className={`mt-0.5 block text-xs ${active ? 'text-[#6e58db]' : 'text-[#81838c]'}`}>
            {device.portrait.width} × {device.portrait.height}
          </span>
        </span>
      </button>
      <IconButton label={device.favorite ? '取消收藏' : '收藏设备'} size="sm" onClick={onFavorite}>
        <Star
          className={`size-4 ${device.favorite ? 'fill-[#f4b51c] text-[#f4b51c]' : 'text-[#a2a4ac]'}`}
        />
      </IconButton>
      <div ref={menuRef} className="relative">
        <IconButton
          label={`更多操作：${device.name}`}
          size="sm"
          onClick={() => setMenuOpen((value) => !value)}
        >
          <EllipsisVertical className="size-4" />
        </IconButton>
        {menuOpen ? (
          <div className="absolute top-9 right-0 z-50 w-36 overflow-hidden rounded-lg border border-[#dedee5] bg-white p-1 text-sm text-[#3f4149] shadow-[0_10px_32px_rgba(20,20,30,.16)]">
            <button
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 hover:bg-[#f3f3f6]"
              onClick={() => run(onEdit)}
            >
              <Pencil className="size-3.5" /> {device.isSystem ? '复制并编辑' : '编辑'}
            </button>
            <button
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 hover:bg-[#f3f3f6]"
              onClick={() => run(onDuplicate)}
            >
              <Copy className="size-3.5" /> 复制
            </button>
            <button
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 hover:bg-[#f3f3f6]"
              onClick={() => run(onExport)}
            >
              <Download className="size-3.5" /> 导出
            </button>
            {!device.isSystem ? (
              <button
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-[#c43838] hover:bg-[#fff0f0]"
                onClick={() => run(onDelete)}
              >
                <Trash2 className="size-3.5" /> 删除
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
