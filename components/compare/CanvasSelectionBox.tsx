interface CanvasSelectionBoxProps {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function CanvasSelectionBox({ left, top, width, height }: CanvasSelectionBoxProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-40 border border-[#6547f5] bg-[#6547f5]/12 shadow-[0_0_0_1px_rgba(255,255,255,.65)_inset]"
      style={{ left, top, width, height }}
    />
  );
}
