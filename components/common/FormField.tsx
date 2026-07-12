import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

interface FieldShellProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  inputId: string;
  children: ReactNode;
}

function FieldShell({ label, hint, error, inputId, children }: FieldShellProps) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm text-[#3f4048]" htmlFor={inputId}>
      <span className="flex items-center justify-between gap-3 font-medium">
        {label}
        {hint ? <span className="font-normal text-[#8b8d96]">{hint}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-[#c62828]" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}

export function TextField({ label, hint, error, id, className = '', ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} inputId={inputId}>
      <input
        id={inputId}
        className={`h-9 min-w-0 rounded-lg border border-[#dddde4] bg-white px-3 text-sm text-[#202127] shadow-sm outline-none transition focus:border-[#8975f7] focus:ring-2 focus:ring-[#ebe7ff] disabled:bg-[#f4f4f6] disabled:text-[#888a92] ${className}`}
        {...props}
      />
    </FieldShell>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
}

export function SelectField({
  label,
  hint,
  error,
  id,
  className = '',
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} inputId={inputId}>
      <select
        id={inputId}
        className={`h-9 min-w-0 appearance-none rounded-lg border border-[#dddde4] bg-white px-3 pr-8 text-sm text-[#202127] shadow-sm outline-none transition focus:border-[#8975f7] focus:ring-2 focus:ring-[#ebe7ff] ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
