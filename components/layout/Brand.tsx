import { PanelsTopLeft, Smartphone } from 'lucide-react';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative grid size-9 shrink-0 place-items-center rounded-[10px] border border-[#d9d1ff] bg-[#f0edff] text-[#5c3cf0]">
        <Smartphone className="size-[19px]" strokeWidth={2.1} />
        <PanelsTopLeft
          className="absolute -right-1 -bottom-1 size-3.5 rounded bg-white"
          strokeWidth={2.3}
        />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#191a20]">
            Device Simulator
          </div>
          <div className="text-[10px] font-medium tracking-wide text-[#8a8c94]">RESPONSIVE LAB</div>
        </div>
      ) : null}
    </div>
  );
}
