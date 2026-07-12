import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { useSimulatorStore } from '../stores/simulator-store';
import { calculateAutoScale } from '../utils/device-scale';

interface UseAutoScaleOptions {
  containerRef: RefObject<HTMLElement | null>;
  contentWidth: number;
  contentHeight: number;
  reservedHeight?: number;
}

export function useAutoScale({
  containerRef,
  contentWidth,
  contentHeight,
  reservedHeight = 90,
}: UseAutoScaleOptions): number {
  const scaleSetting = useSimulatorStore((state) => state.scale);
  const setResolvedScale = useSimulatorStore((state) => state.setResolvedScale);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  const resolved =
    scaleSetting === 'auto' && size.width > 0 && size.height > 0
      ? calculateAutoScale({
          availableWidth: size.width,
          availableHeight: Math.max(1, size.height - reservedHeight),
          contentWidth,
          contentHeight,
          padding: 42,
        })
      : scaleSetting === 'auto'
        ? 0.75
        : scaleSetting;

  useEffect(() => setResolvedScale(resolved), [resolved, setResolvedScale]);
  return resolved;
}
