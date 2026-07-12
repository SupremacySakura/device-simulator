import type { DisplayFeature } from '../../types/device';

interface DisplayFeatureItemProps {
  feature: DisplayFeature;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
}

export function DisplayFeatureItem({
  feature,
  selected,
  editable,
  onSelect,
}: DisplayFeatureItemProps) {
  if (!feature.visible) return null;
  return (
    <button
      type="button"
      tabIndex={editable ? 0 : -1}
      aria-label={feature.name}
      aria-pressed={selected}
      className={`absolute m-0 border-0 p-0 ${editable ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}`}
      style={{
        left: feature.x,
        top: feature.y,
        width: feature.width,
        height: feature.height,
        borderRadius: feature.borderRadius ?? 0,
        backgroundColor: feature.style?.backgroundColor ?? '#050507',
        borderColor: feature.style?.borderColor ?? 'transparent',
        borderWidth: feature.style?.borderWidth ?? 0,
        borderStyle: 'solid',
        opacity: feature.style?.opacity ?? 1,
        transform: `rotate(${feature.rotation ?? 0}deg)`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      {selected ? (
        <span className="pointer-events-none absolute -inset-1.5 rounded-[inherit] border border-dashed border-[#7659ff]" />
      ) : null}
    </button>
  );
}
