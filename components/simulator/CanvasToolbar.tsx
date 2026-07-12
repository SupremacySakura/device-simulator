import { Crosshair, Grid2X2, Hand, MousePointer2, Ruler } from 'lucide-react';
import { IconButton } from '../common/IconButton';

interface CanvasToolbarProps {
  showGrid: boolean;
  showRulers: boolean;
  onToggleGrid: () => void;
  onToggleRulers: () => void;
  onCenter: () => void;
}

export function CanvasToolbar({
  showGrid,
  showRulers,
  onToggleGrid,
  onToggleRulers,
  onCenter,
}: CanvasToolbarProps) {
  return (
    <div className="absolute top-5 left-5 z-30 flex w-11 flex-col items-center gap-1 rounded-xl border border-[#dedee5] bg-white p-1 shadow-[0_4px_16px_rgba(30,30,40,.1)]">
      <IconButton label="选择工具" active size="sm">
        <MousePointer2 className="size-4" />
      </IconButton>
      <IconButton label="平移画布" size="sm">
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
