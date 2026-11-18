import { useState } from 'react';
import { useDeviceStore } from '../../stores/device-store';

const INPUT =
  'w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[12px] text-[#111] outline-none placeholder:text-[#9CA3AF] focus:border-[#C2410C]';

/** 自定义设备表单：只要求五个字段，横屏安全区自动旋转。 */
export function CustomDeviceForm({ onDone }: { onDone: () => void }) {
  const addCustomDevice = useDeviceStore((state) => state.addCustomDevice);
  const [name, setName] = useState('');
  const [width, setWidth] = useState('400');
  const [height, setHeight] = useState('860');
  const [top, setTop] = useState('0');
  const [bottom, setBottom] = useState('0');
  const [error, setError] = useState('');

  const submit = () => {
    const w = Number(width);
    const h = Number(height);
    if (!name.trim()) return setError('请填写设备名称。');
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) {
      return setError('宽高必须是大于 0 的数字。');
    }
    const t = Number(top) || 0;
    const b = Number(bottom) || 0;
    if (t < 0 || b < 0 || t + b >= h) return setError('上下安全区之和必须小于高度。');
    setError('');
    addCustomDevice({
      name,
      width: w,
      height: h,
      safeArea: { top: t, right: 0, bottom: b, left: 0 },
    });
    onDone();
  };

  return (
    <div className="mt-4 rounded-lg border border-[#E5E7EB] p-3">
      <p className="mb-2 text-[12px] font-medium text-[#111]">新增自定义设备</p>
      <div className="mb-2">
        <label className="mb-1 block text-[11px] text-[#6B7280]" htmlFor="cd-name">
          名称
        </label>
        <input
          id="cd-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={INPUT}
        />
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-[#6B7280]" htmlFor="cd-w">
            宽
          </label>
          <input
            id="cd-w"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6B7280]" htmlFor="cd-h">
            高
          </label>
          <input
            id="cd-h"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-[#6B7280]" htmlFor="cd-top">
            安全区上
          </label>
          <input
            id="cd-top"
            value={top}
            onChange={(e) => setTop(e.target.value)}
            className={INPUT}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-[#6B7280]" htmlFor="cd-bottom">
            安全区下
          </label>
          <input
            id="cd-bottom"
            value={bottom}
            onChange={(e) => setBottom(e.target.value)}
            className={INPUT}
          />
        </div>
      </div>
      {error ? <p className="mb-2 text-[11px] text-[#DC2626]">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-[#C2410C] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
