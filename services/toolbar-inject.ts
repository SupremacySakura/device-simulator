/**
 * 注入到目标页的工具条。必须自包含：scripting.executeScript 会序列化此函数，
 * 因此不能引用模块作用域的任何导入。
 */
declare const chrome: {
  runtime: {
    sendMessage: (message: unknown) => Promise<unknown> | void;
  };
};

export interface ToolbarInit {
  devices: Array<{ id: string; name: string }>;
  currentDeviceId: string;
  orientation: 'portrait' | 'landscape';
  zoomPercent: number;
  autoZoom: boolean;
}

export function mountToolbar(init: ToolbarInit): void {
  const HOST_ID = 'device-simulator-toolbar';
  const existing = document.getElementById(HOST_ID);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'all:initial;position:fixed;top:0;left:0;right:0;z-index:2147483647;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .bar {
      position: fixed; top: 8px; left: 50%; transform: translateX(-50%) translateY(-120%);
      display: flex; align-items: center; gap: 2px;
      padding: 4px; border-radius: 10px;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(17,17,17,0.08);
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      font: 500 12px/1 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #111; pointer-events: auto;
      opacity: 0; transition: opacity .16s ease-out, transform .16s ease-out;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    }
    .bar.visible { opacity: 1; transform: translateX(-50%) translateY(0); }
    .zone { position: fixed; top: 0; left: 0; right: 0; height: 28px; pointer-events: auto; }
    select, button {
      all: unset; box-sizing: border-box; cursor: pointer;
      padding: 6px 8px; border-radius: 6px; font: inherit; color: inherit;
      display: inline-flex; align-items: center; gap: 4px;
      transition: background .12s;
    }
    select:hover, button:hover { background: rgba(17,17,17,0.06); }
    button:active { background: rgba(17,17,17,0.10); }
    button:focus-visible, select:focus-visible { outline: 2px solid #FF5500; outline-offset: 1px; }
    select { max-width: 160px; }
    .sep { width: 1px; height: 16px; background: rgba(17,17,17,0.10); margin: 0 2px; }
    .pct { min-width: 38px; text-align: center; font-variant-numeric: tabular-nums; padding: 6px 0; }
    .close { color: #FF5500; }
    .msg {
      position: fixed; top: 52px; left: 50%; transform: translateX(-50%);
      padding: 6px 12px; border-radius: 8px; font: 500 12px/1.4 Inter, system-ui, sans-serif;
      background: #111; color: #fff; pointer-events: none; opacity: 0; transition: opacity .16s;
      max-width: 320px; text-align: center;
    }
    .msg.visible { opacity: 1; }
  `;

  const zone = document.createElement('div');
  zone.className = 'zone';

  const bar = document.createElement('div');
  bar.className = 'bar';

  const select = document.createElement('select');
  select.setAttribute('aria-label', '选择设备');
  for (const device of init.devices) {
    const option = document.createElement('option');
    option.value = device.id;
    option.textContent = device.name;
    if (device.id === init.currentDeviceId) option.selected = true;
    select.appendChild(option);
  }

  const rotate = document.createElement('button');
  rotate.type = 'button';
  rotate.textContent = init.orientation === 'portrait' ? '竖屏' : '横屏';
  rotate.setAttribute('aria-label', '切换横竖屏');

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', '缩小');

  const pct = document.createElement('span');
  pct.className = 'pct';
  pct.textContent = `${init.zoomPercent}%`;

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', '放大');

  const auto = document.createElement('button');
  auto.type = 'button';
  auto.textContent = '适应';
  auto.setAttribute('aria-label', '自动适应窗口');

  const sep = document.createElement('div');
  sep.className = 'sep';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.textContent = '退出';
  close.setAttribute('aria-label', '退出预览');

  const msg = document.createElement('div');
  msg.className = 'msg';

  bar.append(select, rotate, sep.cloneNode(false), minus, pct, plus, auto, sep, close);
  shadow.append(style, zone, bar, msg);

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    try {
      const result = chrome.runtime.sendMessage({
        source: 'device-simulator-toolbar',
        type,
        payload,
      });
      if (result && typeof result.catch === 'function') {
        void result.catch(() => undefined);
      }
    } catch {
      /* 扩展上下文失效时静默忽略 */
    }
  };

  let hideTimer: number | undefined;
  const show = () => {
    bar.classList.add('visible');
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => bar.classList.remove('visible'), 2200);
  };
  const keepVisible = () => {
    bar.classList.add('visible');
    if (hideTimer) window.clearTimeout(hideTimer);
  };

  zone.addEventListener('mouseenter', keepVisible);
  bar.addEventListener('mouseenter', keepVisible);
  bar.addEventListener('mouseleave', () => {
    hideTimer = window.setTimeout(() => bar.classList.remove('visible'), 600);
  });

  select.addEventListener('change', () => send('SELECT_DEVICE', { deviceId: select.value }));
  rotate.addEventListener('click', () => send('TOGGLE_ORIENTATION'));
  minus.addEventListener('click', () => send('STEP_ZOOM', { direction: -1 }));
  plus.addEventListener('click', () => send('STEP_ZOOM', { direction: 1 }));
  auto.addEventListener('click', () => send('AUTO_ZOOM'));
  close.addEventListener('click', () => send('EXIT'));

  window.addEventListener('device-simulator:update', (event) => {
    const detail = (event as CustomEvent).detail as Partial<ToolbarInit> | undefined;
    if (!detail) return;
    if (detail.currentDeviceId) select.value = detail.currentDeviceId;
    if (detail.orientation)
      rotate.textContent = detail.orientation === 'portrait' ? '竖屏' : '横屏';
    if (typeof detail.zoomPercent === 'number') pct.textContent = `${detail.zoomPercent}%`;
  });

  window.addEventListener('device-simulator:message', (event) => {
    const detail = (event as CustomEvent).detail as { text?: string } | undefined;
    if (!detail?.text) return;
    msg.textContent = detail.text;
    msg.classList.add('visible');
    window.setTimeout(() => msg.classList.remove('visible'), 3200);
  });

  document.documentElement.appendChild(host);
  show();
}
