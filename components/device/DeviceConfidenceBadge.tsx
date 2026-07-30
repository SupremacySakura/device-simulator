import type { DeviceConfidence } from '../../types/device';
import {
  getDeviceConfidencePresentation,
  type DeviceConfidenceTone,
} from '../../utils/device-confidence';

const TONE_CLASSES: Record<DeviceConfidenceTone, string> = {
  success: 'border-[#b9dfc8] bg-[#edf8f1] text-[#277044]',
  warning: 'border-[#ead49d] bg-[#fff8e6] text-[#8a641e]',
  danger: 'border-[#efbebe] bg-[#fff0f0] text-[#a33d3d]',
  neutral: 'border-[#d9dae0] bg-[#f4f4f6] text-[#686a73]',
};

interface DeviceConfidenceBadgeProps {
  confidence?: DeviceConfidence | undefined;
  compact?: boolean;
}

export function DeviceConfidenceBadge({ confidence, compact = false }: DeviceConfidenceBadgeProps) {
  const presentation = getDeviceConfidencePresentation(confidence);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border font-medium ${
        compact ? 'px-1.5 py-px text-[9px]' : 'px-2 py-0.5 text-[10px]'
      } ${TONE_CLASSES[presentation.tone]}`}
      title={`设备数据可信度：${presentation.label}`}
    >
      {presentation.label}
    </span>
  );
}
