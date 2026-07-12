import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../constants/default-settings';
import { setWorkspacePanelCollapsed, toggleWorkspacePanel } from '../services/panel-layout-service';
import { useSettingsStore } from '../stores/settings-store';
import {
  serializeSimulatorStore,
  useSimulatorStore,
  type PersistedSimulatorData,
} from '../stores/simulator-store';

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

beforeEach(() => {
  useSettingsStore.getState().hydrate({
    ...DEFAULT_SETTINGS,
    layout: { ...DEFAULT_SETTINGS.layout },
  });
  useSimulatorStore.getState().hydrate({ ...DEFAULT_SIMULATOR });
});

describe('workspace panel layout', () => {
  it('synchronizes quick collapse actions to simulator and saved settings', () => {
    setWorkspacePanelCollapsed('left', true);
    setWorkspacePanelCollapsed('right', true);

    const simulator = useSimulatorStore.getState();
    const settings = useSettingsStore.getState();
    expect(simulator.leftPanelCollapsed).toBe(true);
    expect(simulator.rightPanelCollapsed).toBe(true);
    expect(settings.layout).toEqual({
      leftPanelCollapsed: true,
      rightPanelCollapsed: true,
    });
    expect(serializeSimulatorStore(simulator)).toEqual(
      expect.objectContaining({ leftPanelCollapsed: true, rightPanelCollapsed: true }),
    );
  });

  it('toggles each panel independently', () => {
    toggleWorkspacePanel('left');
    expect(useSimulatorStore.getState().leftPanelCollapsed).toBe(true);
    expect(useSimulatorStore.getState().rightPanelCollapsed).toBe(false);

    toggleWorkspacePanel('right');
    toggleWorkspacePanel('left');
    expect(useSimulatorStore.getState().leftPanelCollapsed).toBe(false);
    expect(useSimulatorStore.getState().rightPanelCollapsed).toBe(true);
    expect(useSettingsStore.getState().layout).toEqual({
      leftPanelCollapsed: false,
      rightPanelCollapsed: true,
    });
  });
});
