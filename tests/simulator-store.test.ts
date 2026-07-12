import { beforeEach, describe, expect, it } from 'vitest';
import { useSimulatorStore, type PersistedSimulatorData } from '../stores/simulator-store';
import { MAX_MANUAL_SCALE, MIN_MANUAL_SCALE } from '../utils/device-scale';

const DEFAULT_SIMULATOR: PersistedSimulatorData = {
  url: '',
  orientation: 'portrait',
  scale: 'auto',
  showSafeArea: true,
  showRulers: true,
  showGrid: false,
  showShadow: true,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  canvasBackground: '#f9fafb',
};

beforeEach(() => useSimulatorStore.getState().hydrate({ ...DEFAULT_SIMULATOR }));

describe('simulator manual scale state', () => {
  it('keeps arbitrary finite zoom values and clamps them to the supported range', () => {
    useSimulatorStore.getState().setScale(0.83);
    expect(useSimulatorStore.getState().scale).toBe(0.83);

    useSimulatorStore.getState().setScale(100);
    expect(useSimulatorStore.getState().scale).toBe(MAX_MANUAL_SCALE);

    useSimulatorStore.getState().setScale(0.001);
    expect(useSimulatorStore.getState().scale).toBe(MIN_MANUAL_SCALE);
  });

  it('preserves automatic scale mode', () => {
    useSimulatorStore.getState().setScale(1.17);
    useSimulatorStore.getState().setScale('auto');
    expect(useSimulatorStore.getState().scale).toBe('auto');
  });
});
