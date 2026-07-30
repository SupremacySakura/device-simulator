import { Grid3X3, Maximize, MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useAutoScale } from '../../hooks/use-auto-scale';
import { useDeviceProfile } from '../../hooks/use-device-profile';
import { useDeviceStore } from '../../stores/device-store';
import { useSimulatorStore } from '../../stores/simulator-store';
import type { DeviceViewportConfig } from '../../types/device';
import type { CanvasTool } from '../../types/simulator';
import {
  calculateDraggedPan,
  calculateWheelZoomScale,
  calculateZoomedPan,
  type CanvasPoint,
} from '../../utils/canvas-transform';
import {
  cloneDeviceProfile,
  getDeviceFrameInsets,
  getDeviceViewport,
} from '../../utils/device-profile';
import { moveCameraPosition } from '../../utils/camera-position';
import { stepManualScale } from '../../utils/device-scale';
import { IconButton } from '../common/IconButton';
import { useToast } from '../common/ToastProvider';
import { CanvasRuler } from './CanvasRuler';
import { CanvasToolbar } from './CanvasToolbar';
import { DevicePreview } from './DevicePreview';

const BACKGROUNDS = ['#ffffff', '#f9fafb', '#eef0f4', '#24252b', '#dfd9cd'] as const;

export function DeviceCanvas() {
  const { device, viewport, orientation } = useDeviceProfile();
  const simulator = useSimulatorStore();
  const updateDevice = useDeviceStore((state) => state.updateDevice);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wheelZoomHandlerRef = useRef<(event: globalThis.WheelEvent) => void>(() => undefined);
  const panFrameRef = useRef<number | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origin: CanvasPoint;
    next: CanvasPoint;
    previousUserSelect: string;
  } | null>(null);
  const [tool, setTool] = useState<CanvasTool>('select');
  const [pan, setPan] = useState<CanvasPoint>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [cameraDragging, setCameraDragging] = useState(false);
  const { showToast } = useToast();

  useEffect(
    () => () => {
      if (panFrameRef.current !== null) cancelAnimationFrame(panFrameRef.current);
      const drag = panDragRef.current;
      if (drag) document.body.style.userSelect = drag.previousUserSelect;
    },
    [],
  );

  const frameInsets = device?.frame.enabled
    ? getDeviceFrameInsets(device, orientation)
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

  const zoomCanvas = (nextScale: number, focus: CanvasPoint = { x: 0, y: 0 }) => {
    if (Math.abs(nextScale - scale) < 0.0001) return;
    setPan((current) => calculateZoomedPan(current, focus, scale, nextScale));
    simulator.setScale(nextScale);
  };

  wheelZoomHandlerRef.current = (event) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1;
    const nextScale = calculateWheelZoomScale(scale, event.deltaY * multiplier);
    zoomCanvas(nextScale, {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    });
  };

  useEffect(() => {
    if (tool !== 'pan') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const interceptWheelZoom = (event: globalThis.WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      wheelZoomHandlerRef.current(event);
    };
    canvas.addEventListener('wheel', interceptWheelZoom, { capture: true, passive: false });
    return () => canvas.removeEventListener('wheel', interceptWheelZoom, { capture: true });
  }, [tool]);

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
    setPan({ x: 0, y: 0 });
  };

  const changeTool = (nextTool: CanvasTool) => {
    const activeDrag = panDragRef.current;
    if (nextTool === 'select' && activeDrag) {
      panDragRef.current = null;
      if (panFrameRef.current !== null) {
        cancelAnimationFrame(panFrameRef.current);
        panFrameRef.current = null;
      }
      setPan(activeDrag.next);
      document.body.style.userSelect = activeDrag.previousUserSelect;
      setIsPanning(false);
    }
    setTool(nextTool);
    if (nextTool === 'pan') simulator.setSelection(null);
  };

  const startPanning = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: pan,
      next: pan,
      previousUserSelect: document.body.style.userSelect,
    };
    document.body.style.userSelect = 'none';
    setIsPanning(true);
  };

  const movePanning = (event: PointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    drag.next = calculateDraggedPan(
      drag.origin,
      { x: drag.startX, y: drag.startY },
      { x: event.clientX, y: event.clientY },
    );
    if (panFrameRef.current !== null) return;
    panFrameRef.current = requestAnimationFrame(() => {
      panFrameRef.current = null;
      const current = panDragRef.current;
      if (current) setPan(current.next);
    });
  };

  const finishPanning = (event: PointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    panDragRef.current = null;
    if (panFrameRef.current !== null) {
      cancelAnimationFrame(panFrameRef.current);
      panFrameRef.current = null;
    }
    setPan(drag.next);
    document.body.style.userSelect = drag.previousUserSelect;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handlePanKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const panStep = event.shiftKey ? 60 : 20;
    const delta =
      event.key === 'ArrowLeft'
        ? { x: -panStep, y: 0 }
        : event.key === 'ArrowRight'
          ? { x: panStep, y: 0 }
          : event.key === 'ArrowUp'
            ? { x: 0, y: -panStep }
            : event.key === 'ArrowDown'
              ? { x: 0, y: panStep }
              : null;
    if (delta) {
      event.preventDefault();
      setPan((current) => ({ x: current.x + delta.x, y: current.y + delta.y }));
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomCanvas(stepManualScale(scale, 1, 0.05));
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomCanvas(stepManualScale(scale, -1, 0.05));
    } else if (event.key === '0') {
      event.preventDefault();
      centerDevice();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      changeTool('select');
    }
  };

  return (
    <section
      ref={canvasRef}
      className={`relative h-full min-w-0 flex-1 overflow-hidden rounded-xl border border-[#e2e3e8] ${tool === 'pan' ? 'touch-none overscroll-none' : ''} ${simulator.showGrid ? 'ds-grid-lines' : 'ds-grid'}`}
      style={{
        backgroundColor: simulator.canvasBackground,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
      aria-label="设备预览画布"
    >
      <CanvasToolbar
        tool={tool}
        showGrid={simulator.showGrid}
        showRulers={simulator.showRulers}
        onToolChange={changeTool}
        onToggleGrid={() => simulator.setShowGrid(!simulator.showGrid)}
        onToggleRulers={() => simulator.setShowRulers(!simulator.showRulers)}
        onCenter={centerDevice}
      />

      <div
        className="absolute top-1/2 left-1/2 z-10"
        style={{
          width: outerWidth * scale,
          height: outerHeight * scale,
          marginLeft: -(outerWidth * scale) / 2,
          marginTop: -(outerHeight * scale) / 2,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
          willChange: isPanning ? 'transform' : undefined,
        }}
      >
        <DevicePreview
          profile={device}
          orientation={orientation}
          url={simulator.url}
          reloadKey={simulator.reloadKey}
          iframeStatus={simulator.iframeStatus}
          iframeMessage={simulator.iframeMessage}
          scale={scale}
          safeAreaVisible={simulator.showSafeArea}
          cameraVisible
          displayFeaturesVisible
          frameVisible
          showShadow={simulator.showShadow}
          selectedCameraId={selectedCameraId}
          selectedFeatureId={selectedFeatureId}
          editable={editable && tool === 'select'}
          interactionBlocked={cameraDragging}
          onStatusChange={simulator.setIframeState}
          onReload={simulator.reload}
          onSelectCamera={(id) => simulator.setSelection({ type: 'camera', id })}
          onSelectFeature={(id) => simulator.setSelection({ type: 'display-feature', id })}
          onMoveCamera={moveCamera}
          onDeleteCamera={deleteCamera}
          onDraggingChange={setCameraDragging}
          onClearSelection={() => simulator.setSelection(null)}
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
        />
      </div>

      {tool === 'pan' ? (
        <div
          role="application"
          tabIndex={0}
          aria-label="小手模式画布。拖拽平移，滚轮缩放，方向键移动，加减键缩放，数字 0 居中，Escape 返回选择工具。"
          className={`absolute inset-0 z-20 touch-none outline-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={startPanning}
          onPointerMove={movePanning}
          onPointerUp={finishPanning}
          onPointerCancel={finishPanning}
          onLostPointerCapture={finishPanning}
          onKeyDown={handlePanKeyDown}
        />
      ) : null}

      {tool === 'pan' ? (
        <div className="pointer-events-none absolute top-5 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-[#ddd9f4] bg-white/94 px-3 py-2 text-xs font-medium text-[#555760] shadow-sm backdrop-blur-sm">
          小手模式 · 拖拽平移 · 滚轮缩放
          <span className="ml-2 rounded bg-[#f0edff] px-1.5 py-0.5 text-[#6045df]">
            {Math.round(scale * 100)}%
          </span>
        </div>
      ) : null}

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
          onClick={() => {
            centerDevice();
            simulator.setScale('auto');
          }}
        >
          <Maximize className="size-4" />
        </IconButton>
      </div>
    </section>
  );
}
