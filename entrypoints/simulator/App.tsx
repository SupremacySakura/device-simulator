import { useState } from 'react';
import { browser } from 'wxt/browser';
import { useStorageReady } from '../../hooks/use-storage-ready';
import { useSettingsStore } from '../../stores/settings-store';
import { tryNormalizeUrl } from '../../utils/url';

export function App() {
  const { ready } = useStorageReady();
  const lastUrl = useSettingsStore((state) => state.lastStandaloneUrl);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [value, setValue] = useState(lastUrl);
  const [error, setError] = useState('');

  if (!ready) {
    return (
      <main className="grid h-screen place-items-center bg-white text-[13px] text-[#6B7280]">
        正在准备…
      </main>
    );
  }

  const open = () => {
    const normalized = tryNormalizeUrl(value);
    if (!normalized.success) {
      setError(normalized.error);
      return;
    }
    setError('');
    updateSettings({ lastStandaloneUrl: normalized.url });
    void browser.tabs.create({ url: normalized.url });
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
            if (event.key === 'Enter') open();
          }}
          placeholder="localhost:3000"
          autoFocus
          className="mb-2 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-[13px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:border-[#FF5500]"
        />
        {error ? <p className="mb-2 text-[12px] text-[#DC2626]">{error}</p> : null}

        <button
          type="button"
          onClick={open}
          className="w-full rounded-lg bg-[#FF5500] px-4 py-2.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5500]"
        >
          打开并预览
        </button>

        <p className="mt-6 text-[11px] leading-relaxed text-[#9CA3AF]">
          预览会使用浏览器的调试协议设定真实视口与安全区。若目标页面已打开 DevTools，需要先关闭它。
        </p>
      </div>
    </main>
  );
}
