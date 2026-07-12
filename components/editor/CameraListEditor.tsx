import { Camera, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CAMERA_TEMPLATES, type CameraTemplateId } from '../../services/device-service';
import type { DeviceCamera, DeviceViewportConfig } from '../../types/device';
import { resolveCameraPosition } from '../../utils/camera-position';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IconButton } from '../common/IconButton';
import { CameraForm } from './CameraForm';

interface CameraListEditorProps {
  cameras: readonly DeviceCamera[];
  viewport: DeviceViewportConfig;
  selectedCameraId: string | null;
  readOnly?: boolean;
  onSelectCamera: (id: string | null) => void;
  onAddTemplate: (template: CameraTemplateId) => void;
  onChangeCamera: (camera: DeviceCamera) => void;
  onDeleteCamera: (id: string) => void;
}

function shapeRadius(camera: DeviceCamera): string {
  if (camera.shape === 'circle') return '999px';
  if (camera.shape === 'ellipse') return '50%';
  if (camera.shape === 'rounded-rect') {
    return `${camera.borderRadius ?? 8}px`;
  }
  return `${camera.borderRadius ?? 0}px`;
}

export function CameraListEditor({
  cameras,
  viewport,
  selectedCameraId,
  readOnly = false,
  onSelectCamera,
  onAddTemplate,
  onChangeCamera,
  onDeleteCamera,
}: CameraListEditorProps) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DeviceCamera | null>(null);
  const selectedCamera = cameras.find((camera) => camera.id === selectedCameraId) ?? null;

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeleteCamera(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <section className="border-t border-[#ececf0] px-4 py-4" aria-labelledby="camera-list-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id="camera-list-heading" className="text-sm font-semibold text-[#292a31]">
            摄像头 / 挖孔
          </h3>
          <p className="mt-0.5 text-[11px] text-[#8b8d96]">
            {cameras.length > 0 ? `${cameras.length} 个屏幕覆盖区域` : '当前方向暂无摄像头'}
          </p>
        </div>
        <IconButton
          label="添加摄像头"
          size="sm"
          disabled={readOnly}
          aria-expanded={templatesOpen}
          onClick={() => setTemplatesOpen((open) => !open)}
        >
          <Plus className="size-4" aria-hidden="true" />
        </IconButton>
      </div>

      {templatesOpen && !readOnly ? (
        <div
          className="mb-3 grid gap-1.5 rounded-xl border border-[#ded9f8] bg-[#faf9ff] p-2"
          aria-label="摄像头模板"
        >
          {CAMERA_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-white focus-visible:bg-white"
              onClick={() => {
                onAddTemplate(template.id);
                setTemplatesOpen(false);
              }}
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[#eeeaff] text-[#6547f5]">
                <Camera className="size-3.5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-medium text-[#383941]">{template.label}</span>
                <span className="mt-0.5 block text-[10px] leading-4 text-[#888a93]">
                  {template.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2">
        {cameras.map((camera) => {
          const active = camera.id === selectedCameraId;
          const position = resolveCameraPosition(camera, viewport);
          return (
            <div
              key={camera.id}
              className={`flex min-h-[62px] items-center gap-2 rounded-xl border p-2 transition-colors ${
                active
                  ? 'border-[#d8cffc] bg-[#f5f2ff]'
                  : 'border-[#e7e7ec] bg-white hover:border-[#dcd8ee]'
              }`}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                aria-pressed={active}
                onClick={() => onSelectCamera(camera.id)}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#f3f3f6]">
                  <span
                    className="block min-h-1.5 min-w-1.5 border border-[#22232a] bg-[#08090b]"
                    style={{
                      width: Math.max(8, Math.min(27, camera.width / 4)),
                      height: Math.max(8, Math.min(18, camera.height / 4)),
                      borderRadius: shapeRadius(camera),
                      opacity: camera.visible ? (camera.style?.opacity ?? 1) : 0.28,
                    }}
                    aria-hidden="true"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[#37383f]">
                    {camera.name}
                  </span>
                  <span className="mt-1 block text-[10px] leading-4 text-[#858790]">
                    x: {position.x}, y: {position.y} · {camera.width} × {camera.height}
                  </span>
                </span>
              </button>
              <IconButton
                label={camera.visible ? `隐藏 ${camera.name}` : `显示 ${camera.name}`}
                size="sm"
                active={camera.visible}
                disabled={readOnly}
                onClick={() => onChangeCamera({ ...camera, visible: !camera.visible })}
              >
                {camera.visible ? (
                  <Eye className="size-3.5" aria-hidden="true" />
                ) : (
                  <EyeOff className="size-3.5" aria-hidden="true" />
                )}
              </IconButton>
              {!readOnly ? (
                <IconButton
                  label={`删除 ${camera.name}`}
                  size="sm"
                  className="hover:!bg-[#fff0f0] hover:!text-[#c43838]"
                  onClick={() => setPendingDelete(camera)}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </IconButton>
              ) : null}
            </div>
          );
        })}

        {cameras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#dcdce3] bg-[#fafafd] px-3 py-5 text-center">
            <Camera className="mx-auto size-5 text-[#aaa7b6]" aria-hidden="true" />
            <p className="mt-2 text-xs text-[#777984]">没有摄像头或挖孔配置</p>
            {!readOnly ? (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-[#6547f5] hover:underline"
                onClick={() => setTemplatesOpen(true)}
              >
                从模板添加
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {selectedCamera ? (
        <CameraForm
          camera={selectedCamera}
          viewport={viewport}
          readOnly={readOnly}
          onChange={onChangeCamera}
          onDone={() => onSelectCamera(null)}
        />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="删除摄像头"
        message={`确定删除“${pendingDelete?.name ?? ''}”吗？此操作会立即保存到当前设备。`}
        confirmLabel="删除"
        danger
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </section>
  );
}
