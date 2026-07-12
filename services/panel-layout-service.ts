import { useSettingsStore } from '../stores/settings-store';
import { useSimulatorStore } from '../stores/simulator-store';

export type WorkspacePanelSide = 'left' | 'right';

export function setWorkspacePanelCollapsed(side: WorkspacePanelSide, collapsed: boolean): void {
  const simulator = useSimulatorStore.getState();
  const settings = useSettingsStore.getState();

  if (side === 'left') simulator.setLeftPanelCollapsed(collapsed);
  else simulator.setRightPanelCollapsed(collapsed);

  settings.updateSettings({
    layout: {
      ...settings.layout,
      [side === 'left' ? 'leftPanelCollapsed' : 'rightPanelCollapsed']: collapsed,
    },
  });
}

export function toggleWorkspacePanel(side: WorkspacePanelSide): void {
  const simulator = useSimulatorStore.getState();
  const collapsed = side === 'left' ? simulator.leftPanelCollapsed : simulator.rightPanelCollapsed;
  setWorkspacePanelCollapsed(side, !collapsed);
}
