interface CanvasRulerProps {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
}

function ticks(length: number): number[] {
  const values: number[] = [];
  for (let value = 0; value <= length; value += 50) values.push(value);
  return values;
}

export function CanvasRuler({ width, height, scale, offsetX, offsetY, visible }: CanvasRulerProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 text-[9px] text-[#60626b]"
      aria-hidden="true"
    >
      <div
        className="absolute -top-7 h-6 border-b border-[#aeb0b8]"
        style={{ left: offsetX * scale, width: width * scale }}
      >
        {ticks(width).map((value) => (
          <span
            key={value}
            className={`absolute bottom-0 border-l border-[#8c8e97] ${value % 100 === 0 ? 'h-3' : 'h-1.5'}`}
            style={{ left: value * scale }}
          >
            {value % 100 === 0 ? (
              <span className="absolute -top-3 -translate-x-1/2 whitespace-nowrap">{value}</span>
            ) : null}
          </span>
        ))}
      </div>
      <div
        className="absolute -left-7 w-6 border-r border-[#aeb0b8]"
        style={{ top: offsetY * scale, height: height * scale }}
      >
        {ticks(height).map((value) => (
          <span
            key={value}
            className={`absolute right-0 border-t border-[#8c8e97] ${value % 100 === 0 ? 'w-3' : 'w-1.5'}`}
            style={{ top: value * scale }}
          >
            {value % 100 === 0 ? (
              <span className="absolute top-0 right-3 -translate-y-1/2 whitespace-nowrap">
                {value}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}
