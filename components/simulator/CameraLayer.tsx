import { useState } from 'react';
import type { DeviceCamera, DeviceViewportConfig } from '../../types/device';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CameraItem } from './CameraItem';

interface CameraLayerProps {
  viewport: DeviceViewportConfig;
  scale: number;
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, deltaX: number, deltaY: number) => void;
  onDelete: (id: string) => void;
  onDraggingChange: (dragging: boolean) => void;
}

export function CameraLayer({
  viewport,
  scale,
  selectedId,
  editable,
  onSelect,
  onMove,
  onDelete,
  onDraggingChange,
}: CameraLayerProps) {
  const [pendingDelete, setPendingDelete] = useState<DeviceCamera | null>(null);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20">
        {viewport.cameras.map((camera) => (
          <CameraItem
            key={camera.id}
            camera={camera}
            viewport={viewport}
            scale={scale}
            selected={selectedId === camera.id}
            editable={editable}
            onSelect={() => onSelect(camera.id)}
            onMove={(deltaX, deltaY) => onMove(camera.id, deltaX, deltaY)}
            onDeleteRequest={() => setPendingDelete(camera)}
            onDraggingChange={onDraggingChange}
          />
        ))}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除摄像头"
        message={`确定删除“${pendingDelete?.name ?? ''}”吗？此操作会立即保存到当前自定义设备。`}
        confirmLabel="删除"
        danger
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
}
