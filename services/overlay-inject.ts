/**
 * 注入到宿主页的覆盖层。必须自包含：scripting.executeScript 会序列化此函数，
 * 不能引用模块作用域的任何导入或变量。
 */
export interface OverlayDevice {
  id: string;
  name: string;
  /** masks 由 background 预先算好，注入函数只负责把样式贴上去。 */
  portrait: OverlayViewport;
  landscape: OverlayViewport;
}

export interface OverlayViewport {
  width: number;
  height: number;
  screenRadius: number;
  masks: Array<Record<string, string>>;
}

export interface OverlayInit {
  targetUrl: string;
  devices: OverlayDevice[];
  currentDeviceId: string;
  orientation: 'portrait' | 'landscape';
  zoomMode: 'auto' | 'manual';
  manualScale: number;
}

export function mountOverlay(init: OverlayInit): void {
  // 自包含：不能引用模块作用域的常量或导入，否则序列化后会变成 undefined。
  const HOST_ID = 'device-simulator-overlay';
  const FRAME_BEZEL = 12;
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:auto;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .backdrop {
      position: absolute; inset: 0; display: flex;
      align-items: center; justify-content: center;
      background: #fff; overflow: hidden;
      font: 500 12px/1 Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      color: #111;
    }
    .stage { position: relative; }
    .scaler { transform-origin: top left; }
    .frame {
      position: relative;
      background: #1a1a1a;
      box-shadow: 0 8px 32px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .screen {
      position: relative; overflow: hidden; background: #fff;
    }
    .screen iframe {
      display: block; border: 0; background: #fff;
    }
    .mask { position: absolute; inset: 0; pointer-events: none; }
    .notch {
      position: absolute; left: 50%; transform: translateX(-50%);
      background: #1a1a1a; border-bottom-left-radius: 18px; border-bottom-right-radius: 18px;
    }
    .home { position: absolute; left: 50%; transform: translateX(-50%);
            border-radius: 999px; background: rgba(17,17,17,0.85); }
    .bar {
      position: absolute; top: 12px; left: 50%; transform: translateX(-50%) translateY(-180%);
      display: flex; align-items: center; gap: 2px; padding: 4px;
      border-radius: 10px; background: rgba(255,255,255,0.94);
      border: 1px solid rgba(17,17,17,0.08);
      box-shadow: 0 4px 16px rgba(0,0,0,0.10);
      opacity: 0; visibility: hidden;
      transition: opacity .16s ease-out, transform .16s ease-out, visibility .16s;
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    }
    .bar.visible { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
    .zone { position: absolute; top: 0; left: 50%; transform: translateX(-50%);
            width: 320px; height: 16px; }
    /* 可见时只让出指针事件，保持焦点不丢失，避免键盘用户被踢回页面顶部。 */
    .zone.gone { pointer-events: none; }
    .zone:focus-visible { outline: 2px solid #C2410C; outline-offset: 2px; border-radius: 4px; }
    select, button {
      all: unset; box-sizing: border-box; cursor: pointer;
      padding: 6px 8px; border-radius: 6px; font: inherit; color: inherit;
      display: inline-flex; align-items: center; gap: 4px; transition: background .12s;
    }
    select:hover, button:hover { background: rgba(17,17,17,0.06); }
    button:active { background: rgba(17,17,17,0.10); }
    button:focus-visible, select:focus-visible { outline: 2px solid #C2410C; outline-offset: 1px; }
    select { max-width: 160px; appearance: auto; -webkit-appearance: menulist; }
    .sep { width: 1px; height: 16px; background: rgba(17,17,17,0.10); margin: 0 2px; }
    .pct { min-width: 38px; text-align: center; font-variant-numeric: tabular-nums; padding: 6px 0; }
    .close { color: #C2410C; }
    .on { background: rgba(194,65,12,0.12); color: #9A3412; }
    .hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      max-width: 420px; padding: 8px 12px; border-radius: 8px;
      background: #111; color: #fff; font: 500 12px/1.5 Inter, system-ui, sans-serif;
      opacity: 0; transition: opacity .2s; pointer-events: none; text-align: center;
    }
    .hint.visible { opacity: 1; }
  `;

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';

  const stage = document.createElement('div');
  stage.className = 'stage';

  const scaler = document.createElement('div');
  scaler.className = 'scaler';

  const frame = document.createElement('div');
  frame.className = 'frame';

  const screen = document.createElement('div');
  screen.className = 'screen';

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', '设备网页预览');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

  const maskLayer = document.createElement('div');
  maskLayer.className = 'mask';

  screen.append(iframe, maskLayer);
  frame.append(screen);
  scaler.append(frame);
  stage.append(scaler);

  const zone = document.createElement('div');
  zone.className = 'zone';
  // 工具条隐藏时控件不可聚焦，键盘用户需要一个能把它叫出来的入口。
  zone.tabIndex = 0;
  zone.setAttribute('role', 'button');
  zone.setAttribute('aria-label', '显示预览控制条');

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
  rotate.setAttribute('aria-label', '切换横竖屏');

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−';
  minus.setAttribute('aria-label', '缩小');

  const pct = document.createElement('span');
  pct.className = 'pct';

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+';
  plus.setAttribute('aria-label', '放大');

  const auto = document.createElement('button');
  auto.type = 'button';
  auto.textContent = '适应';
  auto.setAttribute('aria-label', '自动适应窗口');
  auto.setAttribute('aria-pressed', 'true');

  const sep = document.createElement('div');
  sep.className = 'sep';

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.textContent = '退出';
  close.setAttribute('aria-label', '退出预览');

  const hint = document.createElement('div');
  hint.className = 'hint';

  bar.append(select, rotate, sep.cloneNode(false), minus, pct, plus, auto, sep, close);
  backdrop.append(stage, zone, bar, hint);
  shadow.append(style, backdrop);
  document.documentElement.appendChild(host);

  let state = {
    deviceId: init.currentDeviceId,
    orientation: init.orientation,
    zoomMode: init.zoomMode,
    manualScale: init.manualScale,
  };

  const findDevice = (id: string) => init.devices.find((d) => d.id === id) ?? init.devices[0]!;
  const viewportOf = (device: OverlayDevice) =>
    state.orientation === 'portrait' ? device.portrait : device.landscape;

  const autoZoom = () => {
    const vp = viewportOf(findDevice(state.deviceId));
    const usableW = window.innerWidth - 64;
    const usableH = window.innerHeight - 64;
    if (usableW <= 0 || usableH <= 0) return 0.1;
    const fit = Math.min(
      usableW / (vp.width + FRAME_BEZEL * 2),
      usableH / (vp.height + FRAME_BEZEL * 2),
    );
    return Math.max(0.1, Math.min(1, fit));
  };

  const currentZoom = () => {
    if (state.zoomMode === 'auto') return autoZoom();
    return Math.max(0.1, Math.min(3, state.manualScale));
  };

  const render = () => {
    const device = findDevice(state.deviceId);
    const vp = viewportOf(device);
    const zoom = currentZoom();
    const frameWidth = vp.width + FRAME_BEZEL * 2;
    const frameHeight = vp.height + FRAME_BEZEL * 2;

    iframe.style.width = `${vp.width}px`;
    iframe.style.height = `${vp.height}px`;

    screen.style.width = `${vp.width}px`;
    screen.style.height = `${vp.height}px`;
    screen.style.borderRadius = `${vp.screenRadius}px`;

    // 缩放整台设备（含机身留白），iframe 自身的 CSS 尺寸始终等于设备视口。
    scaler.style.width = `${frameWidth}px`;
    scaler.style.height = `${frameHeight}px`;
    scaler.style.transform = `scale(${zoom})`;

    frame.style.padding = `${FRAME_BEZEL}px`;
    frame.style.borderRadius = `${vp.screenRadius + FRAME_BEZEL}px`;

    stage.style.width = `${frameWidth * zoom}px`;
    stage.style.height = `${frameHeight * zoom}px`;

    maskLayer.style.width = `${vp.width}px`;
    maskLayer.style.height = `${vp.height}px`;
    maskLayer.replaceChildren();

    for (const mask of vp.masks) {
      const node = document.createElement('div');
      Object.assign(node.style, mask);
      maskLayer.appendChild(node);
    }

    pct.textContent = `${Math.round(zoom * 100)}%`;
    rotate.textContent = state.orientation === 'portrait' ? '竖屏' : '横屏';
    auto.classList.toggle('on', state.zoomMode === 'auto');
    auto.setAttribute('aria-pressed', String(state.zoomMode === 'auto'));
    select.value = state.deviceId;
  };

  const loadTarget = () => {
    iframe.src = init.targetUrl;
    hint.textContent = '';
    hint.classList.remove('visible');
  };

  // 跨域 iframe 的失败没有可靠信号，只能超时提示，且不声称知道确切原因。
  let loadTimer: number | undefined;
  const startLoadWatch = () => {
    if (loadTimer) window.clearTimeout(loadTimer);
    loadTimer = window.setTimeout(() => {
      hint.textContent =
        '页面可能禁止被嵌入（X-Frame-Options 或 CSP），也可能只是加载慢。本地 dev server 通常可用。';
      hint.classList.add('visible');
    }, 8000);
  };
  iframe.addEventListener('load', () => {
    if (loadTimer) window.clearTimeout(loadTimer);
    hint.classList.remove('visible');
  });

  let hideTimer: number | undefined;
  const setVisible = (visible: boolean) => {
    bar.classList.toggle('visible', visible);
    zone.classList.toggle('gone', visible);
    for (const el of [select, rotate, minus, plus, auto, close]) {
      el.tabIndex = visible ? 0 : -1;
    }
  };
  const show = () => {
    setVisible(true);
    if (hideTimer) window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => setVisible(false), 2200);
  };
  const keepVisible = () => {
    setVisible(true);
    if (hideTimer) window.clearTimeout(hideTimer);
  };

  zone.addEventListener('mouseenter', keepVisible);
  zone.addEventListener('click', keepVisible);
  zone.addEventListener('focus', keepVisible);
  zone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    keepVisible();
    select.focus();
  });
  bar.addEventListener('mouseenter', keepVisible);
  bar.addEventListener('focusin', keepVisible);
  bar.addEventListener('mouseleave', () => {
    hideTimer = window.setTimeout(() => setVisible(false), 600);
  });
  bar.addEventListener('focusout', (event) => {
    if (!bar.contains(event.relatedTarget as Node | null)) {
      hideTimer = window.setTimeout(() => setVisible(false), 600);
    }
  });

  select.addEventListener('change', () => {
    state = { ...state, deviceId: select.value };
    render();
  });
  rotate.addEventListener('click', () => {
    state = {
      ...state,
      orientation: state.orientation === 'portrait' ? 'landscape' : 'portrait',
    };
    render();
  });
  minus.addEventListener('click', () => {
    state = { ...state, zoomMode: 'manual', manualScale: currentZoom() - 0.1 };
    render();
  });
  plus.addEventListener('click', () => {
    state = { ...state, zoomMode: 'manual', manualScale: currentZoom() + 0.1 };
    render();
  });
  auto.addEventListener('click', () => {
    state = { ...state, zoomMode: 'auto' };
    render();
  });
  close.addEventListener('click', () => {
    host.remove();
  });

  window.addEventListener('resize', () => {
    if (state.zoomMode === 'auto') render();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') host.remove();
  });

  render();
  loadTarget();
  startLoadWatch();
  show();
}
