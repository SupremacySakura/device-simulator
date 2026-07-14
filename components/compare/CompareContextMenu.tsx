import { useEffect, useRef, type ReactNode } from 'react';

export interface CompareContextMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  onSelect: () => void;
}

interface CompareContextMenuProps {
  x: number;
  y: number;
  items: readonly CompareContextMenuItem[];
  onClose: () => void;
}

export function CompareContextMenu({ x, y, items, onClose }: CompareContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    });
    const close = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      closeRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="对比画布菜单"
      className="fixed z-[90] min-w-48 overflow-hidden rounded-xl border border-[#dedee5] bg-white p-1.5 shadow-[0_14px_45px_rgba(30,30,40,.2)]"
      style={{
        left: Math.min(x, window.innerWidth - 220),
        top: Math.min(y, window.innerHeight - 360),
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={item.separatorBefore ? 'mt-1 border-t border-[#ededf1] pt-1' : ''}
        >
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={`flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
              item.danger
                ? 'text-[#c93636] hover:bg-[#fff0f0]'
                : 'text-[#383940] hover:bg-[#f3f1ff] hover:text-[#5d3df0]'
            }`}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span className="grid size-4 shrink-0 place-items-center" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
