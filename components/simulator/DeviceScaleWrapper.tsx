import type { ReactNode } from 'react';

interface DeviceScaleWrapperProps {
  width: number;
  height: number;
  scale: number;
  overlay?: ReactNode | undefined;
  children: ReactNode;
}

export function DeviceScaleWrapper({
  width,
  height,
  scale,
  overlay,
  children,
}: DeviceScaleWrapperProps) {
  return (
    <div className="relative shrink-0" style={{ width: width * scale, height: height * scale }}>
      {overlay}
      <div
        className="absolute top-0 left-1/2"
        style={{
          marginLeft: -width / 2,
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
