import { DEFAULT_DEVICE_ID } from './default-devices';

export interface DeviceSimulatorSettings {
  defaultDeviceId: string;
  defaultScale: number | 'auto';
  showShadow: boolean;
  showGrid: boolean;
  autoOpenCurrentPage: boolean;
  layout: {
    leftPanelCollapsed: boolean;
    rightPanelCollapsed: boolean;
  };
}

export const DEFAULT_SETTINGS: DeviceSimulatorSettings = {
  defaultDeviceId: DEFAULT_DEVICE_ID,
  defaultScale: 'auto',
  showShadow: true,
  showGrid: false,
  autoOpenCurrentPage: true,
  layout: {
    leftPanelCollapsed: false,
    rightPanelCollapsed: false,
  },
};

export type DefaultSettings = DeviceSimulatorSettings;

export default DEFAULT_SETTINGS;
