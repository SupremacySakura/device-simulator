import { PanelLeftOpen, PanelRightOpen, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { IconButton } from '../common/IconButton';

interface AppShellProps {
  toolbar: ReactNode;
  navigation: ReactNode;
  leftPanel?: ReactNode | undefined;
  canvas: ReactNode;
  rightPanel?: ReactNode | undefined;
}

export function AppShell({ toolbar, navigation, leftPanel, canvas, rightPanel }: AppShellProps) {
  const [compactLeftOpen, setCompactLeftOpen] = useState(false);
  const [compactRightOpen, setCompactRightOpen] = useState(false);

  return (
    <div className="flex h-screen min-h-[560px] w-screen min-w-[760px] flex-col overflow-hidden bg-[#f6f6f8]">
      {toolbar}
      <div className="flex min-h-0 min-w-0 flex-1">
        {navigation}
        <div className="max-[960px]:hidden">{leftPanel}</div>
        <main className="flex min-h-0 min-w-0 flex-1 p-2.5">{canvas}</main>
        <div className="max-[1160px]:hidden">{rightPanel}</div>

        {leftPanel ? (
          <div className="fixed top-[72px] left-20 z-40 hidden max-[960px]:block">
            <IconButton
              label="打开设备面板"
              className="!border-[#dedee5] !bg-white shadow-lg"
              onClick={() => setCompactLeftOpen(true)}
            >
              <PanelLeftOpen className="size-4" />
            </IconButton>
          </div>
        ) : null}
        {rightPanel ? (
          <div className="fixed top-[72px] right-2 z-40 hidden max-[1160px]:block">
            <IconButton
              label="打开属性面板"
              className="!border-[#dedee5] !bg-white shadow-lg"
              onClick={() => setCompactRightOpen(true)}
            >
              <PanelRightOpen className="size-4" />
            </IconButton>
          </div>
        ) : null}

        {compactLeftOpen && leftPanel ? (
          <div className="fixed inset-x-0 top-16 bottom-0 z-50 hidden max-[960px]:block">
            <button
              type="button"
              aria-label="点击遮罩关闭设备面板"
              className="absolute inset-0 left-[72px] bg-black/20 backdrop-blur-[1px]"
              onClick={() => setCompactLeftOpen(false)}
            />
            <div className="absolute top-0 bottom-0 left-[72px] shadow-2xl">
              {leftPanel}
              <IconButton
                label="关闭设备面板"
                className="absolute top-3 right-3 !border-[#dedee5] !bg-white shadow-sm"
                onClick={() => setCompactLeftOpen(false)}
              >
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
        ) : null}

        {compactRightOpen && rightPanel ? (
          <div className="fixed inset-x-0 top-16 bottom-0 z-50 hidden max-[1160px]:block">
            <button
              type="button"
              aria-label="点击遮罩关闭属性面板"
              className="absolute inset-0 left-[72px] bg-black/20 backdrop-blur-[1px]"
              onClick={() => setCompactRightOpen(false)}
            />
            <div className="absolute top-0 right-0 bottom-0 shadow-2xl">
              {rightPanel}
              <IconButton
                label="关闭属性面板"
                className="absolute top-3 right-3 !border-[#dedee5] !bg-white shadow-sm"
                onClick={() => setCompactRightOpen(false)}
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
