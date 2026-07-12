import { Crosshair, Grid2X2, Hand, MousePointer2, Ruler } from 'lucide-react';
import type { CanvasTool } from '../../types/simulator';
import { IconButton } from '../common/IconButton';

interface CanvasToolbarProps {
  tool: CanvasTool;
  showGrid: boolean;
  showRulers: boolean;
  onToolChange: (tool: CanvasTool) => void;
  onToggleGrid: () => void;
  onToggleRulers: () => void;
  onCenter: () => void;
}

export function CanvasToolbar({
  tool,
  showGrid,
  showRulers,
  onToolChange,
  onToggleGrid,
  onToggleRulers,
  onCenter,
}: CanvasToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="画布工具"
      className="absolute top-5 left-5 z-30 flex w-11 flex-col items-center gap-1 rounded-xl border border-[#dedee5] bg-white p-1 shadow-[0_4px_16px_rgba(30,30,40,.1)]"
    >
      <IconButton
        label="选择工具"
        active={tool === 'select'}
        size="sm"
        onClick={() => onToolChange('select')}
      >
        <MousePointer2 className="size-4" />
      </IconButton>
      <IconButton
        label="小手模式：平移和缩放画布"
        active={tool === 'pan'}
        size="sm"
        onClick={() => onToolChange('pan')}
      >
        <Hand className="size-4" />
      </IconButton>
      <IconButton label="切换网格" active={showGrid} size="sm" onClick={onToggleGrid}>
        <Grid2X2 className="size-4" />
      </IconButton>
      <IconButton label="切换标尺" active={showRulers} size="sm" onClick={onToggleRulers}>
        <Ruler className="size-4" />
      </IconButton>
      <IconButton label="居中设备" size="sm" onClick={onCenter}>
        <Crosshair className="size-4" />
      </IconButton>
    </div>
  );
}
