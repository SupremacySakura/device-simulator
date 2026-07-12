import type { DeviceViewportConfig } from '../../types/device';
import { DisplayFeatureItem } from './DisplayFeatureItem';

interface DisplayFeatureLayerProps {
  viewport: DeviceViewportConfig;
  selectedId: string | null;
  editable: boolean;
  onSelect: (id: string) => void;
}

export function DisplayFeatureLayer({
  viewport,
  selectedId,
  editable,
  onSelect,
}: DisplayFeatureLayerProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {viewport.displayFeatures.map((feature) => (
        <DisplayFeatureItem
          key={feature.id}
          feature={feature}
          selected={selectedId === feature.id}
          editable={editable}
          onSelect={() => onSelect(feature.id)}
        />
      ))}
    </div>
  );
}
