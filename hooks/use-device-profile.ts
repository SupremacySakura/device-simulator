import { useMemo } from 'react';
import { useDeviceStore } from '../stores/device-store';
import { useSimulatorStore } from '../stores/simulator-store';
import { getDeviceViewport } from '../utils/device-profile';

export function useDeviceProfile() {
  const devices = useDeviceStore((state) => state.devices);
  const currentDeviceId = useDeviceStore((state) => state.currentDeviceId);
  const orientation = useSimulatorStore((state) => state.orientation);
  const device = useMemo(
    () => devices.find((item) => item.id === currentDeviceId) ?? devices[0],
    [currentDeviceId, devices],
  );
  const viewport = useMemo(
    () => (device ? getDeviceViewport(device, orientation) : undefined),
    [device, orientation],
  );
  return { device, viewport, orientation };
}
