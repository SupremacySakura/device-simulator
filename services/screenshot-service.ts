import { browser } from 'wxt/browser';

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浏览器截图数据无法解码。'));
    image.src = source;
  });
}

export async function captureElementFromVisibleTab(element: HTMLElement): Promise<Blob> {
  let dataUrl: string;
  try {
    const currentWindow = await browser.windows.getCurrent();
    if (currentWindow.id === undefined) throw new Error('无法确定当前浏览器窗口。');
    dataUrl = await browser.tabs.captureVisibleTab(currentWindow.id, { format: 'png' });
  } catch (error) {
    throw new Error('当前浏览器未授予可视标签页截图权限。', { cause: error });
  }

  const image = await loadImage(dataUrl);
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) throw new Error('设备预览当前不可见，无法截图。');

  const pixelRatioX = image.naturalWidth / window.innerWidth;
  const pixelRatioY = image.naturalHeight / window.innerHeight;
  const sourceX = Math.max(0, rect.left * pixelRatioX);
  const sourceY = Math.max(0, rect.top * pixelRatioY);
  const sourceWidth = Math.min(image.naturalWidth - sourceX, rect.width * pixelRatioX);
  const sourceHeight = Math.min(image.naturalHeight - sourceY, rect.height * pixelRatioY);
  if (sourceWidth <= 0 || sourceHeight <= 0) throw new Error('设备预览超出当前可视区域。');

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('浏览器不支持 Canvas 截图裁剪。');
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('截图导出失败。'));
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
