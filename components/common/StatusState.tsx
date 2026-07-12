import { AlertCircle, Box, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface StateProps {
  title: string;
  description: string;
  action?: ReactNode | undefined;
  compact?: boolean | undefined;
}

function StateShell({
  icon,
  title,
  description,
  action,
  compact = false,
}: StateProps & { icon: ReactNode }) {
  return (
    <div
      className={`grid place-items-center text-center ${compact ? 'gap-2 px-4 py-7' : 'min-h-56 gap-3 px-8 py-12'}`}
    >
      <div className="grid size-10 place-items-center rounded-xl bg-[#f0edff] text-[#6547f5]">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-[#2f3037]">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-5 text-[#7b7d86]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function LoadingState({
  title = '正在加载…',
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  return (
    <StateShell
      title={title}
      description="正在准备设备配置和预览内容。"
      icon={<LoaderCircle className="ds-spinner size-5" />}
      compact={compact}
    />
  );
}

export function EmptyState({ title, description, action, compact }: StateProps) {
  return (
    <StateShell
      title={title}
      description={description}
      action={action}
      icon={<Box className="size-5" />}
      compact={compact}
    />
  );
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  compact = false,
}: StateProps & { retryLabel?: string; onRetry?: () => void }) {
  return (
    <StateShell
      title={title}
      description={description}
      icon={<AlertCircle className="size-5 text-[#d54545]" />}
      compact={compact}
      action={
        onRetry ? (
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel ?? '重试'}
          </Button>
        ) : undefined
      }
    />
  );
}
