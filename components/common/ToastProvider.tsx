import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { IconButton } from './IconButton';

type ToastKind = 'success' | 'info' | 'error';

interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = crypto.randomUUID();
      setItems((current) => [...current.slice(-2), { id, message, kind }]);
      window.setTimeout(() => remove(id), 3200);
    },
    [remove],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-5 left-1/2 z-[140] flex -translate-x-1/2 flex-col items-center gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === 'error' ? 'alert' : 'status'}
            className="ds-toast pointer-events-auto flex min-w-72 max-w-lg items-center gap-2 rounded-xl border border-[#dedee6] bg-white px-3 py-2.5 text-sm text-[#303139] shadow-[0_12px_40px_rgba(20,20,30,.16)]"
          >
            {item.kind === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0 text-[#25875a]" />
            ) : item.kind === 'error' ? (
              <TriangleAlert className="size-4 shrink-0 text-[#cf4242]" />
            ) : (
              <Info className="size-4 shrink-0 text-[#6547f5]" />
            )}
            <span className="min-w-0 flex-1">{item.message}</span>
            <IconButton label="关闭提示" size="sm" onClick={() => remove(item.id)}>
              <X className="size-3.5" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// This colocated hook intentionally shares the provider's private context.
// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
