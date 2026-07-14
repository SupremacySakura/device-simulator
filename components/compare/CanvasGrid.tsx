interface CanvasGridProps {
  visible: boolean;
  gridSize: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function CanvasGrid({ visible, gridSize, scale, offsetX, offsetY }: CanvasGridProps) {
  if (!visible) return null;
  const size = Math.max(4, gridSize * scale);
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-70"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(101, 71, 245, .3) 1px, transparent 1.2px)',
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  );
}
