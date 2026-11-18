import { useState } from 'react';
import { browser } from 'wxt/browser';
import { useStorageReady } from '../../hooks/use-storage-ready';
import { useSettingsStore } from '../../stores/settings-store';
import { tryNormalizeUrl } from '../../utils/url';
import { CustomDeviceForm } from './CustomDeviceForm';

export function App() {
  const { ready } = useStorageReady();
  const lastUrl = useSettingsStore((state) => state.lastStandaloneUrl);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [value, setValue] = useState(lastUrl);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  if (!ready) {
    return (
      <main className="grid h-screen place-items-center bg-white text-[13px] text-[#6B7280]">
        正在准备…
      </main>
    );
  }

  const open = async () => {
    const normalized = tryNormalizeUrl(value);
    if (!normalized.success) {
      setError(normalized.error);
      return;
    }
    setError('');
    updateSettings({ lastStandaloneUrl: normalized.url });
    const tab = await browser.tabs.create({ url: normalized.url });
    // 新标签页需要时间加载，等页面可脚本化后再请求附加调试器。
    if (tab.id !== undefined) {
      setTimeout(() => {
        void browser.runtime.sendMessage({
          source: 'device-simulator',
          type: 'START',
          tabId: tab.id,
        });
      }, 800);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-white px-6">
      <div className="w-full max-w-[420px]">
        <h1 className="mb-2 text-[24px] leading-tight font-semibold tracking-[-0.02em] text-[#111]">
          Device Simulator
        </h1>
        <p className="mb-8 text-[13px] leading-relaxed text-[#6B7280]">
          输入要预览的地址。打开后会以手机视口显示，点扩展图标即可退出。
        </p>

        <label className="mb-1.5 block text-[11px] font-medium text-[#6B7280]" htmlFor="url">
          页面地址
        </label>
        <input
          id="url"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void open();
          }}
          placeholder="localhost:3000"
          autoFocus
          className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-[13px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:border-[#C2410C]"
        />
        {error ? <p className="mb-2 text-[12px] text-[#DC2626]">{error}</p> : null}

        <button
          type="button"
          onClick={() => void open()}
          className="w-full rounded-lg bg-[#C2410C] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C2410C]"
        >
          打开并预览
        </button>

        <button
          type="button"
          onClick={() => setShowForm((open) => !open)}
          className="mt-4 text-[11px] font-medium text-[#6B7280] underline underline-offset-2 hover:text-[#111]"
        >
          {showForm ? '收起自定义设备' : '新增自定义设备'}
        </button>
        {showForm ? <CustomDeviceForm onDone={() => setShowForm(false)} /> : null}

        <p className="mt-6 text-[11px] leading-relaxed text-[#9CA3AF]">
          预览会使用浏览器的调试协议设定真实视口与安全区。若目标页面已打开 DevTools，需要先关闭它。
        </p>
      </div>
    </main>
  );
}
