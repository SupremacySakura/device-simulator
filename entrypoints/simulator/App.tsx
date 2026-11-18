import { useEffect, useMemo, useRef, useState } from 'react';
import { useStorageReady } from '../../hooks/use-storage-ready';
import { useDeviceStore } from '../../stores/device-store';
import { useSettingsStore } from '../../stores/settings-store';
import { tryNormalizeUrl } from '../../utils/url';
import { CustomDeviceForm } from './CustomDeviceForm';
import { DeviceStage } from './DeviceStage';

export function App() {
  const { ready, error: storageError } = useStorageReady();
  const lastUrl = useSettingsStore((state) => state.lastStandaloneUrl);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const devices = useDeviceStore((state) => state.devices);
  const currentDeviceId = useDeviceStore((state) => state.currentDeviceId);
  const setCurrentDevice = useDeviceStore((state) => state.setCurrentDevice);

  const [input, setInput] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [zoomMode, setZoomMode] = useState<'auto' | 'manual'>('auto');
  const [manualScale, setManualScale] = useState(0.6);
  const stageRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: 1280, height: 800 });

  useEffect(() => {
    if (ready && lastUrl && !input) setInput(lastUrl);
  }, [ready, lastUrl, input]);

  useEffect(() => {
    const measure = () => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) setWindowSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [ready]);

  const device = useMemo(
    () => devices.find((item) => item.id === currentDeviceId) ?? devices[0],
    [devices, currentDeviceId],
  );

  const open = () => {
    const normalized = tryNormalizeUrl(input);
    if (!normalized.success) {
      setError(normalized.error);
      return;
    }
    setError('');
    setUrl(normalized.url);
    updateSettings({ lastStandaloneUrl: normalized.url });
  };

  if (!ready) {
    return (
      <main className="grid h-screen place-items-center bg-white text-[13px] text-[#6B7280]">
        正在准备…
      </main>
    );
  }

  const stage = (
    <div ref={stageRef} className="min-h-0 flex-1">
      {device && url ? (
        <DeviceStage
          device={device}
          url={url}
          orientation={orientation}
          zoomMode={zoomMode}
          manualScale={manualScale}
          windowSize={windowSize}
        />
      ) : (
        <div className="grid h-full place-items-center px-6 text-center">
          <p className="text-[13px] text-[#9CA3AF]">输入地址后在这里预览</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] px-4 py-2.5">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') open();
          }}
          placeholder="localhost:3000"
          aria-label="页面地址"
          className="min-w-[180px] flex-1 rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-[12px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:border-[#C2410C]"
        />
        <button
          type="button"
          onClick={open}
          className="rounded-md bg-[#C2410C] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
        >
          加载
        </button>

        <div className="mx-1 h-4 w-px bg-[#E5E7EB]" />

        <select
          value={currentDeviceId}
          onChange={(event) => setCurrentDevice(event.target.value)}
          aria-label="选择设备"
          className="max-w-[180px] rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[12px] text-[#111] outline-none focus:border-[#C2410C]"
        >
          {devices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}
          className="rounded-md px-2 py-1.5 text-[12px] font-medium text-[#111] hover:bg-[#F3F4F6]"
        >
          {orientation === 'portrait' ? '竖屏' : '横屏'}
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="缩小"
            onClick={() => {
              setZoomMode('manual');
              setManualScale((s) => Math.max(0.1, Math.round((s - 0.1) * 100) / 100));
            }}
            className="rounded-md px-2 py-1.5 text-[12px] text-[#111] hover:bg-[#F3F4F6]"
          >
            −
          </button>
          <button
            type="button"
            aria-label="自动适应窗口"
            onClick={() => setZoomMode('auto')}
            aria-pressed={zoomMode === 'auto'}
            className={`min-w-[44px] rounded-md px-2 py-1.5 text-[12px] font-medium tabular-nums hover:bg-[#F3F4F6] ${
              zoomMode === 'auto' ? 'text-[#9A3412]' : 'text-[#111]'
            }`}
          >
            {zoomMode === 'auto' ? '适应' : '自定义'}
          </button>
          <button
            type="button"
            aria-label="放大"
            onClick={() => {
              setZoomMode('manual');
              setManualScale((s) => Math.min(3, Math.round((s + 0.1) * 100) / 100));
            }}
            className="rounded-md px-2 py-1.5 text-[12px] text-[#111] hover:bg-[#F3F4F6]"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="text-[11px] font-medium text-[#6B7280] underline underline-offset-2 hover:text-[#111]"
        >
          {showForm ? '收起' : '自定义设备'}
        </button>
      </header>

      {storageError ? (
        <p className="border-b border-[#FEE2E2] bg-[#FEF2F2] px-4 py-2 text-[11px] text-[#DC2626]">
          {storageError}
        </p>
      ) : null}
      {error ? (
        <p className="border-b border-[#FEE2E2] bg-[#FEF2F2] px-4 py-2 text-[11px] text-[#DC2626]">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <div className="border-b border-[#E5E7EB] px-4 py-3">
          <CustomDeviceForm onDone={() => setShowForm(false)} />
        </div>
      ) : null}

      {stage}
    </div>
  );
}
