import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}

export function IconButton({
  label,
  children,
  active,
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={props['aria-pressed'] ?? (active === undefined ? undefined : active)}
      title={label}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        size === 'sm' ? 'size-8' : 'size-9'
      } ${
        active === true
          ? 'border-[#d9d1ff] bg-[#f0edff] text-[#5c3cf0]'
          : 'border-transparent bg-transparent text-[#45464f] hover:bg-[#f1f1f5]'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
