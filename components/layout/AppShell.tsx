import { PanelLeftOpen, PanelRightOpen, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '../common/IconButton';

interface AppShellProps {
  toolbar: ReactNode;
  navigation: ReactNode;
  leftPanel: ReactNode;
  leftPanelCollapsed: boolean;
  onExpandLeftPanel: () => void;
  canvas: ReactNode;
  rightPanel: ReactNode;
  rightPanelCollapsed: boolean;
  onExpandRightPanel: () => void;
  leftPanelId?: string;
  leftPanelLabel?: string;
  rightPanelId?: string;
  rightPanelLabel?: string;
  mainClassName?: string;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

export function AppShell({
  toolbar,
  navigation,
  leftPanel,
  leftPanelCollapsed,
  onExpandLeftPanel,
  canvas,
  rightPanel,
  rightPanelCollapsed,
  onExpandRightPanel,
  leftPanelId = 'device-list-panel',
  leftPanelLabel = '设备列表',
  rightPanelId = 'device-property-panel',
  rightPanelLabel = '设备信息',
  mainClassName = 'p-2.5',
}: AppShellProps) {
  const compactLeft = useMediaQuery('(max-width: 960px)');
  const compactRight = useMediaQuery('(max-width: 1160px)');
  const [compactLeftOpen, setCompactLeftOpen] = useState(false);
  const [compactRightOpen, setCompactRightOpen] = useState(false);
  const leftTriggerRef = useRef<HTMLDivElement>(null);
  const rightTriggerRef = useRef<HTMLDivElement>(null);
  const leftDialogRef = useRef<HTMLDivElement>(null);
  const rightDialogRef = useRef<HTMLDivElement>(null);

  const focusTrigger = (side: 'left' | 'right') => {
    const trigger = side === 'left' ? leftTriggerRef.current : rightTriggerRef.current;
    requestAnimationFrame(() => trigger?.querySelector<HTMLButtonElement>('button')?.focus());
  };

  const closeCompactLeft = () => {
    setCompactLeftOpen(false);
    focusTrigger('left');
  };

  const closeCompactRight = () => {
    setCompactRightOpen(false);
    focusTrigger('right');
  };

  const openCompactLeft = () => {
    setCompactRightOpen(false);
    setCompactLeftOpen(true);
  };

  const openCompactRight = () => {
    setCompactLeftOpen(false);
    setCompactRightOpen(true);
  };

  useEffect(() => {
    if (!compactLeft || leftPanelCollapsed) setCompactLeftOpen(false);
  }, [compactLeft, leftPanelCollapsed]);

  useEffect(() => {
    if (!compactRight || rightPanelCollapsed) setCompactRightOpen(false);
  }, [compactRight, rightPanelCollapsed]);

  useEffect(() => {
    if (!compactLeftOpen) return;
    const frame = requestAnimationFrame(() => {
      leftDialogRef.current
        ?.querySelector<HTMLButtonElement>('[data-panel-drawer-close="true"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [compactLeftOpen]);

  useEffect(() => {
    if (!compactRightOpen) return;
    const frame = requestAnimationFrame(() => {
      rightDialogRef.current
        ?.querySelector<HTMLButtonElement>('[data-panel-drawer-close="true"]')
        ?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [compactRightOpen]);

  useEffect(() => {
    if (!compactLeftOpen && !compactRightOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      if (compactLeftOpen) {
        setCompactLeftOpen(false);
        focusTrigger('left');
      } else {
        setCompactRightOpen(false);
        focusTrigger('right');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [compactLeftOpen, compactRightOpen]);

  const expandLeftPanel = () => {
    onExpandLeftPanel();
    if (compactLeft) openCompactLeft();
  };

  const expandRightPanel = () => {
    onExpandRightPanel();
    if (compactRight) openCompactRight();
  };

  return (
    <div className="flex h-screen min-h-[560px] w-screen min-w-[760px] flex-col overflow-hidden bg-[#f6f6f8]">
      {toolbar}
      <div className="flex min-h-0 min-w-0 flex-1">
        {navigation}
        {!leftPanelCollapsed && !compactLeft ? <div>{leftPanel}</div> : null}
        <main className={`flex min-h-0 min-w-0 flex-1 ${mainClassName}`}>{canvas}</main>
        {!rightPanelCollapsed && !compactRight ? <div>{rightPanel}</div> : null}

        <div ref={leftTriggerRef} className="fixed top-[72px] left-20 z-40">
          {leftPanelCollapsed ? (
            <IconButton
              label={`展开${leftPanelLabel}`}
              aria-controls={leftPanelId}
              aria-expanded="false"
              className="!border-[#dcd8f4] !bg-white text-[#6045df] shadow-lg"
              onClick={expandLeftPanel}
            >
              <PanelLeftOpen className="size-4" />
            </IconButton>
          ) : compactLeft ? (
            <IconButton
              label={`打开${leftPanelLabel}`}
              aria-controls={leftPanelId}
              aria-expanded={compactLeftOpen}
              className="!border-[#dedee5] !bg-white shadow-lg"
              onClick={openCompactLeft}
            >
              <PanelLeftOpen className="size-4" />
            </IconButton>
          ) : null}
        </div>

        <div ref={rightTriggerRef} className="fixed top-[72px] right-2 z-40">
          {rightPanelCollapsed ? (
            <IconButton
              label={`展开${rightPanelLabel}`}
              aria-controls={rightPanelId}
              aria-expanded="false"
              className="!border-[#dcd8f4] !bg-white text-[#6045df] shadow-lg"
              onClick={expandRightPanel}
            >
              <PanelRightOpen className="size-4" />
            </IconButton>
          ) : compactRight ? (
            <IconButton
              label={`打开${rightPanelLabel}`}
              aria-controls={rightPanelId}
              aria-expanded={compactRightOpen}
              className="!border-[#dedee5] !bg-white shadow-lg"
              onClick={openCompactRight}
            >
              <PanelRightOpen className="size-4" />
            </IconButton>
          ) : null}
        </div>

        {compactLeft && compactLeftOpen && !leftPanelCollapsed ? (
          <div
            ref={leftDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={leftPanelLabel}
            className="fixed inset-x-0 top-16 bottom-0 z-50"
          >
            <button
              type="button"
              aria-label={`点击遮罩关闭${leftPanelLabel}`}
              className="absolute inset-0 left-[72px] bg-black/20 backdrop-blur-[1px]"
              onClick={closeCompactLeft}
            />
            <div className="absolute top-0 bottom-0 left-[72px] shadow-2xl">
              {leftPanel}
              <IconButton
                label={`关闭${leftPanelLabel}`}
                data-panel-drawer-close="true"
                className="absolute top-3 right-[-44px] !border-[#dedee5] !bg-white shadow-sm"
                onClick={closeCompactLeft}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
        ) : null}

        {compactRight && compactRightOpen && !rightPanelCollapsed ? (
          <div
            ref={rightDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={rightPanelLabel}
            className="fixed inset-x-0 top-16 bottom-0 z-50"
          >
            <button
              type="button"
              aria-label={`点击遮罩关闭${rightPanelLabel}`}
              className="absolute inset-0 left-[72px] bg-black/20 backdrop-blur-[1px]"
              onClick={closeCompactRight}
            />
            <div className="absolute top-0 right-0 bottom-0 shadow-2xl">
              {rightPanel}
              <IconButton
                label={`关闭${rightPanelLabel}`}
                data-panel-drawer-close="true"
                className="absolute top-3 left-[-44px] !border-[#dedee5] !bg-white shadow-sm"
                onClick={closeCompactRight}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
