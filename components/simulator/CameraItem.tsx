import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { DeviceCamera, DeviceViewportConfig } from '../../types/device';
import { resolveCameraPosition } from '../../utils/camera-position';

interface CameraItemProps {
  camera: DeviceCamera;
  viewport: DeviceViewportConfig;
  scale: number;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onMove: (deltaX: number, deltaY: number) => void;
  onDeleteRequest: () => void;
  onDraggingChange: (dragging: boolean) => void;
}

function borderRadius(camera: DeviceCamera): number | string {
  if (camera.shape === 'circle' || camera.shape === 'ellipse') return '999px';
  if (camera.shape === 'rounded-rect') return camera.borderRadius ?? 10;
  return camera.borderRadius ?? 0;
}

export function CameraItem({
  camera,
  viewport,
  scale,
  selected,
  editable,
  onSelect,
  onMove,
  onDeleteRequest,
  onDraggingChange,
}: CameraItemProps) {
  const position = resolveCameraPosition(camera, viewport);
  const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
    };
    document.body.style.userSelect = 'none';
    onSelect();
    onDraggingChange(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    let x = (event.clientX - drag.startX) / scale;
    let y = (event.clientY - drag.startY) / scale;
    if (event.shiftKey) {
      if (Math.abs(x) >= Math.abs(y)) y = 0;
      else x = 0;
    }
    drag.x = x;
    drag.y = y;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setDragDelta({ x, y }));
  };

  const finishDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    document.body.style.userSelect = '';
    setDragDelta({ x: 0, y: 0 });
    onDraggingChange(false);
    if (drag.x !== 0 || drag.y !== 0) onMove(drag.x, drag.y);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!editable) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onDeleteRequest();
      return;
    }
    const amount = event.shiftKey ? 10 : 1;
    const delta =
      event.key === 'ArrowLeft'
        ? { x: -amount, y: 0 }
        : event.key === 'ArrowRight'
          ? { x: amount, y: 0 }
          : event.key === 'ArrowUp'
            ? { x: 0, y: -amount }
            : event.key === 'ArrowDown'
              ? { x: 0, y: amount }
              : null;
    if (delta) {
      event.preventDefault();
      onMove(delta.x, delta.y);
    }
  };

  if (!camera.visible) return null;
  return (
    <button
      type="button"
      aria-label={`${camera.name}，${Math.round(camera.width)} × ${Math.round(camera.height)} px`}
      aria-pressed={selected}
      tabIndex={editable ? 0 : -1}
      className={`absolute m-0 border-0 p-0 ${editable ? 'pointer-events-auto cursor-move touch-none' : 'pointer-events-none'} ${selected ? 'z-20' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        width: camera.width,
        height: camera.height,
        borderRadius: borderRadius(camera),
        backgroundColor: camera.style?.backgroundColor ?? '#050507',
        borderColor: camera.style?.borderColor ?? 'transparent',
        borderWidth: camera.style?.borderWidth ?? 0,
        borderStyle: 'solid',
        opacity: camera.style?.opacity ?? 1,
        transform: `translate(${dragDelta.x}px, ${dragDelta.y}px) rotate(${camera.rotation ?? 0}deg)`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onKeyDown={handleKeyDown}
    >
      {selected ? (
        <>
          <span className="pointer-events-none absolute -inset-1.5 rounded-[inherit] border border-dashed border-[#7659ff]" />
          <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#6547f5] px-1.5 py-0.5 text-[9px] font-medium text-white shadow">
            {Math.round(camera.width)} × {Math.round(camera.height)}
          </span>
        </>
      ) : null}
    </button>
  );
}
