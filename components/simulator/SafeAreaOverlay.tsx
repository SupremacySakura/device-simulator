import type { SafeAreaInsets } from '../../types/device';
import type { ReactNode } from 'react';

interface SafeAreaOverlayProps {
  insets: SafeAreaInsets;
  width: number;
  height: number;
  visible: boolean;
}

function Label({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span
      className={`absolute z-10 rounded bg-[#e9f4ff]/95 px-1 py-0.5 text-[9px] font-semibold text-[#2784d8] shadow-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function SafeAreaOverlay({ insets, width, height, visible }: SafeAreaOverlayProps) {
  if (!visible) return null;
  const innerWidth = Math.max(0, width - insets.left - insets.right);
  const innerHeight = Math.max(0, height - insets.top - insets.bottom);
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {insets.top > 0 ? (
        <div
          className="absolute top-0 border-b border-dashed border-[#59aafa] bg-[#55adff]/10"
          style={{ left: insets.left, width: innerWidth, height: insets.top }}
        >
          <Label className="top-1 left-1/2 -translate-x-1/2">{insets.top}px</Label>
        </div>
      ) : null}
      {insets.bottom > 0 ? (
        <div
          className="absolute bottom-0 border-t border-dashed border-[#59aafa] bg-[#55adff]/10"
          style={{ left: insets.left, width: innerWidth, height: insets.bottom }}
        >
          <Label className="right-1 bottom-1">{insets.bottom}px</Label>
        </div>
      ) : null}
      {insets.left > 0 ? (
        <div
          className="absolute left-0 border-r border-dashed border-[#59aafa] bg-[#55adff]/10"
          style={{ top: insets.top, width: insets.left, height: innerHeight }}
        >
          <Label className="top-1/2 left-0 -translate-y-1/2">{insets.left}px</Label>
        </div>
      ) : null}
      {insets.right > 0 ? (
        <div
          className="absolute right-0 border-l border-dashed border-[#59aafa] bg-[#55adff]/10"
          style={{ top: insets.top, width: insets.right, height: innerHeight }}
        >
          <Label className="top-1/2 right-0 -translate-y-1/2">{insets.right}px</Label>
        </div>
      ) : null}
      <div
        className="absolute border border-dashed border-[#59aafa]/80"
        style={{
          top: insets.top,
          right: insets.right,
          bottom: insets.bottom,
          left: insets.left,
        }}
      />
    </div>
  );
}
