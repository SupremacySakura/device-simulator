import type { DeviceConfidence } from '../types/device';

export type DeviceConfidenceTone = 'success' | 'warning' | 'danger' | 'neutral';

const PRESENTATION: Record<DeviceConfidence, { label: string; tone: DeviceConfidenceTone }> = {
  high: { label: '高可信', tone: 'success' },
  medium: { label: '中可信', tone: 'warning' },
  low: { label: '低可信', tone: 'danger' },
  unverified: { label: '未验证', tone: 'neutral' },
};

export function getDeviceConfidencePresentation(confidence?: DeviceConfidence) {
  return PRESENTATION[confidence ?? 'unverified'];
}
