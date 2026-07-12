import { Grid3X3, Maximize, MoonStar, SunMedium } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAutoScale } from '../../hooks/use-auto-scale';
import { useDeviceProfile } from '../../hooks/use-device-profile';
import { useDeviceStore } from '../../stores/device-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type { DeviceViewportConfig } from '../../types/device';
import { cloneDeviceProfile, getDeviceViewport } from '../../utils/device-profile';
import { moveCameraPosition } from '../../utils/camera-position';
import { IconButton } from '../common/IconButton';
import { useToast } from '../common/ToastProvider';
import { CanvasRuler } from './CanvasRuler';
import { CanvasToolbar } from './CanvasToolbar';
import { DeviceFrame } from './DeviceFrame';
import { DeviceScaleWrapper } from './DeviceScaleWrapper';

const BACKGROUNDS = ['#ffffff', '#f9fafb', '#eef0f4', '#24252b', '#dfd9cd'] as const;

export function DeviceCanvas() {
  const { device, viewport, orientation } = useDeviceProfile();
  const simulator = useSimulatorStore();
  const updateDevice = useDeviceStore((state) => state.updateDevice);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const { showToast } = useToast();

  const frameInsets = device?.frame.enabled
    ? device.frame.insets
    : { top: 0, right: 0, bottom: 0, left: 0 };
  const borderWidth = device?.frame.enabled ? device.frame.borderWidth : 0;
  const outerWidth = viewport
    ? viewport.width + frameInsets.left + frameInsets.right + borderWidth * 2
    : 1;
  const outerHeight = viewport
    ? viewport.height + frameInsets.top + frameInsets.bottom + borderWidth * 2
    : 1;
  const scale = useAutoScale({
    containerRef: canvasRef,
    contentWidth: outerWidth,
    contentHeight: outerHeight,
  });

  if (!device || !viewport) return null;

  const selectedCameraId = simulator.selection?.type === 'camera' ? simulator.selection.id : null;
  const selectedFeatureId =
    simulator.selection?.type === 'display-feature' ? simulator.selection.id : null;
  const editable = simulator.editMode && !device.isSystem;

  const mutateViewport = (mutator: (draft: DeviceViewportConfig) => void) => {
    const current = useDeviceStore.getState().devices.find((item) => item.id === device.id);
    if (!current || current.isSystem) {
      showToast('系统设备需先复制为自定义设备后编辑。', 'info');
      return;
    }
    const draft = cloneDeviceProfile(current);
    mutator(getDeviceViewport(draft, orientation));
    updateDevice(draft);
  };

  const moveCamera = (id: string, deltaX: number, deltaY: number) => {
    mutateViewport((draft) => {
      draft.cameras = draft.cameras.map((camera) =>
        camera.id === id
          ? { ...camera, position: moveCameraPosition(camera.position, deltaX, deltaY) }
          : camera,
      );
    });
  };

  const deleteCamera = (id: string) => {
    mutateViewport((draft) => {
      draft.cameras = draft.cameras.filter((camera) => camera.id !== id);
    });
    simulator.setSelection(null);
    showToast('摄像头已删除');
  };

  const centerDevice = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2),
      top: Math.max(0, (scroller.scrollHeight - scroller.clientHeight) / 2),
      behavior: 'smooth',
    });
  };

  return (
    <section
      ref={canvasRef}
      className={`relative h-full min-w-0 flex-1 overflow-hidden rounded-xl border border-[#e2e3e8] ${simulator.showGrid ? 'ds-grid-lines' : 'ds-grid'}`}
      style={{ backgroundColor: simulator.canvasBackground }}
      aria-label="设备预览画布"
    >
      <CanvasToolbar
        showGrid={simulator.showGrid}
        showRulers={simulator.showRulers}
        onToggleGrid={() => simulator.setShowGrid(!simulator.showGrid)}
        onToggleRulers={() => simulator.setShowRulers(!simulator.showRulers)}
        onCenter={centerDevice}
      />

      <div ref={scrollRef} className="absolute inset-0 overflow-auto overscroll-contain">
        <div className="flex min-h-full min-w-full items-start justify-center px-24 pt-14 pb-28">
          <DeviceScaleWrapper
            width={outerWidth}
            height={outerHeight}
            scale={scale}
            overlay={
              <CanvasRuler
                width={viewport.width}
                height={viewport.height}
                scale={scale}
                offsetX={frameInsets.left + borderWidth}
                offsetY={frameInsets.top + borderWidth}
                visible={simulator.showRulers}
              />
            }
          >
            <DeviceFrame
              device={device}
              viewport={viewport}
              url={simulator.url}
              reloadKey={simulator.reloadKey}
              iframeStatus={simulator.iframeStatus}
              iframeMessage={simulator.iframeMessage}
              scale={scale}
              showSafeArea={simulator.showSafeArea}
              showShadow={simulator.showShadow}
              selectedCameraId={selectedCameraId}
              selectedFeatureId={selectedFeatureId}
              editable={editable}
              dragging={dragging}
              onStatusChange={simulator.setIframeState}
              onReload={simulator.reload}
              onSelectCamera={(id) => simulator.setSelection({ type: 'camera', id })}
              onSelectFeature={(id) => simulator.setSelection({ type: 'display-feature', id })}
              onMoveCamera={moveCamera}
              onDeleteCamera={deleteCamera}
              onDraggingChange={setDragging}
              onClearSelection={() => simulator.setSelection(null)}
            />
          </DeviceScaleWrapper>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-3 rounded-xl border border-[#dedee5] bg-white px-3 shadow-[0_5px_20px_rgba(30,30,40,.12)]">
        <span className="text-xs font-medium text-[#555760]">背景</span>
        <div className="flex items-center gap-1.5">
          {BACKGROUNDS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`画布背景 ${color}`}
              title={`画布背景 ${color}`}
              className={`size-5 rounded-full border shadow-sm ${simulator.canvasBackground === color ? 'ring-2 ring-[#7659ff] ring-offset-2' : ''}`}
              style={{
                backgroundColor: color,
                borderColor: color === '#ffffff' ? '#d9d9df' : color,
              }}
              onClick={() => simulator.setCanvasBackground(color)}
            />
          ))}
        </div>
        <span className="h-6 w-px bg-[#e8e8ec]" />
        <button
          type="button"
          className="flex items-center gap-2 text-xs font-medium text-[#555760]"
          aria-pressed={simulator.showShadow}
          onClick={() => simulator.setShowShadow(!simulator.showShadow)}
        >
          {simulator.showShadow ? (
            <MoonStar className="size-4 text-[#6547f5]" />
          ) : (
            <SunMedium className="size-4" />
          )}
          阴影
          <span
            className={`relative h-5 w-9 rounded-full transition-colors ${simulator.showShadow ? 'bg-[#6547f5]' : 'bg-[#d4d5db]'}`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${simulator.showShadow ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
            />
          </span>
        </button>
        <span className="h-6 w-px bg-[#e8e8ec]" />
        <IconButton
          label="切换网格"
          size="sm"
          active={simulator.showGrid}
          onClick={() => simulator.setShowGrid(!simulator.showGrid)}
        >
          <Grid3X3 className="size-4" />
        </IconButton>
        <IconButton
          label="自动适应"
          size="sm"
          active={simulator.scale === 'auto'}
          onClick={() => simulator.setScale('auto')}
        >
          <Maximize className="size-4" />
        </IconButton>
      </div>
    </section>
  );
}
