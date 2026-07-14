import { Blocks, CircleHelp, Columns2, Settings, Smartphone, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';

interface SidebarNavigationProps {
  mode?: 'single' | 'compare';
  onSingle?: () => void;
  onCompare: () => void;
  onTools: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

interface NavItemProps {
  label: string;
  active?: boolean;
  icon: ReactNode;
  onClick?: () => void;
}

function NavItem({ label, active = false, icon, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`flex h-[70px] w-[60px] flex-col items-center justify-center gap-1.5 rounded-xl text-xs transition-colors ${
        active
          ? 'bg-[#f0edff] font-medium text-[#5c3cf0]'
          : 'text-[#53555e] hover:bg-[#f4f4f7] hover:text-[#24252b]'
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function SidebarNavigation({
  mode = 'single',
  onSingle,
  onCompare,
  onTools,
  onSettings,
  onAbout,
}: SidebarNavigationProps) {
  return (
    <nav
      aria-label="工作台导航"
      className="flex h-full w-[72px] shrink-0 flex-col items-center border-r border-[#e8e8ed] bg-white py-3"
    >
      <div className="flex flex-1 flex-col items-center gap-2">
        <NavItem
          label="设备"
          active={mode === 'single'}
          icon={<Smartphone className="size-[21px]" />}
          {...(onSingle === undefined ? {} : { onClick: onSingle })}
        />
        <NavItem
          label="对比"
          active={mode === 'compare'}
          icon={<Columns2 className="size-[21px]" />}
          onClick={onCompare}
        />
        <NavItem label="工具" icon={<Wrench className="size-[21px]" />} onClick={onTools} />
        <NavItem label="设置" icon={<Settings className="size-[21px]" />} onClick={onSettings} />
      </div>
      <div className="flex flex-col items-center gap-2 border-t border-[#ededf1] pt-3">
        <NavItem label="关于" icon={<CircleHelp className="size-[21px]" />} onClick={onAbout} />
        <div
          className="grid size-8 place-items-center rounded-lg bg-[#f4f3ff] text-[#735df4]"
          title="Manifest V3"
        >
          <Blocks className="size-4" />
        </div>
      </div>
    </nav>
  );
}
