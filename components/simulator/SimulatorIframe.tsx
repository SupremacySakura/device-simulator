import { ExternalLink, LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import type { IframeStatus } from '../../types/simulator';
import { Button } from '../common/Button';

interface SimulatorIframeProps {
  url: string;
  reloadKey: number;
  observedUrl?: string | null;
  status: IframeStatus;
  message: string;
  interactionBlocked: boolean;
  onStatusChange: (status: IframeStatus, message?: string) => void;
  onReload: () => void;
  title?: string;
  name?: string;
  iframeRef?: Ref<HTMLIFrameElement>;
}

const BLOCKED_MESSAGE =
  '该页面可能禁止在 iframe 中加载。常见原因包括 X-Frame-Options、CSP frame-ancestors、登录状态或 Cookie 限制。';

export function SimulatorIframe({
  url,
  reloadKey,
  observedUrl = null,
  status,
  message,
  interactionBlocked,
  onStatusChange,
  onReload,
  title = '设备网页预览',
  name,
  iframeRef,
}: SimulatorIframeProps) {
  const timeoutRef = useRef<number | null>(null);
  const lastReloadKeyRef = useRef(reloadKey);
  const [iframeUrl, setIframeUrl] = useState(url);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current === null) return;
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const reloadRequested = lastReloadKeyRef.current !== reloadKey;
  const renderedUrl = reloadRequested ? url : iframeUrl;

  useEffect(() => {
    if (lastReloadKeyRef.current !== reloadKey) {
      lastReloadKeyRef.current = reloadKey;
      setIframeUrl(url);
      return;
    }
    if (observedUrl !== url) setIframeUrl(url);
  }, [observedUrl, reloadKey, url]);

  useEffect(() => {
    if (!url || (observedUrl === url && !reloadRequested)) return;
    onStatusChangeRef.current('loading');
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onStatusChangeRef.current('blocked', BLOCKED_MESSAGE);
    }, 9000);
    return clearLoadTimeout;
  }, [clearLoadTimeout, observedUrl, reloadKey, reloadRequested, url]);

  if (!url) {
    return (
      <div className="grid size-full place-items-center bg-white px-8 text-center">
        <div>
          <div className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-[#f0edff] text-[#6547f5]">
            <ExternalLink className="size-5" />
          </div>
          <h3 className="text-sm font-semibold text-[#292a31]">输入 URL 开始模拟</h3>
          <p className="mt-1 text-xs leading-5 text-[#7a7c85]">
            支持可嵌入的 http(s) 页面和本地开发服务。
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <iframe
        key={reloadKey}
        title={title}
        name={name}
        ref={iframeRef}
        src={renderedUrl}
        className="absolute inset-0 size-full border-0 bg-white"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="clipboard-read; clipboard-write; fullscreen"
        onLoad={() => {
          clearLoadTimeout();
          onStatusChangeRef.current('loaded');
        }}
        onError={() => {
          clearLoadTimeout();
          onStatusChangeRef.current('error', '页面加载失败，请检查 URL 和网络连接。');
        }}
      />
      {status === 'loading' ? (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-white/78 backdrop-blur-[1px]">
          <div className="rounded-xl border border-[#e4e1f7] bg-white px-4 py-3 text-center shadow-lg">
            <LoaderCircle className="ds-spinner mx-auto size-5 text-[#6547f5]" />
            <p className="mt-2 text-xs font-medium text-[#555760]">正在加载页面…</p>
          </div>
        </div>
      ) : null}
      {status === 'error' || status === 'blocked' ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-white/96 px-7 text-center">
          <div className="max-w-[320px]">
            <ShieldAlert className="mx-auto size-7 text-[#d04a4a]" />
            <h3 className="mt-3 text-sm font-semibold text-[#292a31]">页面无法可靠嵌入</h3>
            <p className="mt-2 text-xs leading-5 text-[#666873]">{message || BLOCKED_MESSAGE}</p>
            <p className="mt-2 text-[11px] leading-4 text-[#8a8c95]">
              你仍然可以使用允许 iframe 的本地开发页面进行调试。扩展不会默认移除站点安全响应头。
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={onReload}>
                <RotateCcw className="size-3.5" /> 重试
              </Button>
              <Button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="size-3.5" /> 新标签打开
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {interactionBlocked ? (
        <div className="absolute inset-0 z-40 cursor-grabbing bg-transparent" aria-hidden="true" />
      ) : null}
    </>
  );
}
