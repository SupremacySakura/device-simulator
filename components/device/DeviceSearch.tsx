import { Search, X } from 'lucide-react';
import { IconButton } from '../common/IconButton';

interface DeviceSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function DeviceSearch({ value, onChange }: DeviceSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#7f818a]" />
      <input
        aria-label="搜索设备名称"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索设备名称"
        className="h-10 w-full rounded-lg border border-[#dedee5] bg-white pr-9 pl-9 text-sm outline-none transition placeholder:text-[#a0a2aa] focus:border-[#8f7af7] focus:ring-2 focus:ring-[#ece8ff]"
      />
      {value ? (
        <IconButton
          label="清除设备搜索"
          size="sm"
          className="absolute top-1 right-1"
          onClick={() => onChange('')}
        >
          <X className="size-3.5" />
        </IconButton>
      ) : null}
    </div>
  );
}
