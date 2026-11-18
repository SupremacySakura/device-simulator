import { useEffect, useRef, useState } from 'react';
import type { DeviceProfile, DeviceOrientation } from '../../types/device';
import { maskStyle } from '../../utils/mask-style';
import {
  FRAME_BEZEL,
  getOrientedViewport,
  resolveZoom,
  toMaskShapes,
  type WindowSize,
} from '../../utils/viewport-transform';

interface DeviceStageProps {
  device: DeviceProfile;
  url: string;
  orientation: DeviceOrientation;
  zoomMode: 'auto' | 'manual';
  manualScale: number;
  windowSize: WindowSize;
}

const LOAD_TIMEOUT_MS = 8000;

export function DeviceStage({
  device,
  url,
  orientation,
  zoomMode,
  manualScale,
  windowSize,
}: DeviceStageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const viewport = getOrientedViewport(device, orientation);
  const zoom = resolveZoom(viewport, windowSize, zoomMode, manualScale);
  const maskShapes = toMaskShapes(viewport);
  const frameWidth = viewport.width + FRAME_BEZEL * 2;
  const frameHeight = viewport.height + FRAME_BEZEL * 2;

  useEffect(() => {
    setLoaded(false);
    setTimedOut(false);
    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [url]);

  return (
    <div className="relative grid h-full place-items-center overflow-hidden bg-white">
      <div
        style={{
          width: frameWidth * zoom,
          height: frameHeight * zoom,
        }}
      >
        {/* 缩放整台设备（含机身留白），iframe 自身的 CSS 尺寸始终等于设备视口 */}
        <div
          style={{
            width: frameWidth,
            height: frameHeight,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className="relative overflow-hidden bg-[#1a1a1a]"
            style={{
              padding: FRAME_BEZEL,
              borderRadius: (viewport.screenRadius ?? 36) + FRAME_BEZEL,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }}
          >
            <div
              className="relative overflow-hidden bg-white"
              style={{
                width: viewport.width,
                height: viewport.height,
                borderRadius: viewport.screenRadius ?? 36,
              }}
            >
              <iframe
                ref={iframeRef}
                src={url}
                title="设备网页预览"
                onLoad={() => setLoaded(true)}
                className="block border-0 bg-white"
                style={{ width: viewport.width, height: viewport.height }}
              />

              {/* 遮挡层：只盖住内容，不收缩 iframe 视口，因此断点与真机一致 */}
              <div className="pointer-events-none absolute inset-0">
                {maskShapes.map((shape) => (
                  <div key={shape.kind} style={maskStyle(shape)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {timedOut && !loaded ? (
        <p className="absolute bottom-4 left-1/2 max-w-[420px] -translate-x-1/2 rounded-lg bg-[#111] px-3 py-2 text-center text-[12px] leading-relaxed font-medium text-white">
          页面可能禁止被嵌入（X-Frame-Options 或 CSP），也可能只是加载慢。本地 dev server 通常可用。
        </p>
      ) : null}
    </div>
  );
}
