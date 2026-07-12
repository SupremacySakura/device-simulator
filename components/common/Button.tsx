import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'border-transparent bg-[#6547f5] text-white shadow-sm hover:bg-[#5636ed] disabled:bg-[#aaa0e8]',
  secondary:
    'border-[#dedee5] bg-white text-[#24242a] shadow-sm hover:border-[#c9c6e9] hover:bg-[#faf9ff]',
  ghost: 'border-transparent bg-transparent text-[#50515a] hover:bg-[#f1f1f5]',
  danger: 'border-[#ffd6d6] bg-[#fff5f5] text-[#c62828] hover:bg-[#ffebeb]',
};

export function Button({
  children,
  variant = 'secondary',
  loading = false,
  fullWidth = false,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantClass[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle aria-hidden="true" className="ds-spinner size-4" /> : null}
      {children}
    </button>
  );
}
