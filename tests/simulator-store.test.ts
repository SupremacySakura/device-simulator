import { beforeEach, describe, expect, it } from 'vitest';
import { useSimulatorStore } from '../stores/simulator-store';

describe('simulator store', () => {
  beforeEach(() => {
    useSimulatorStore.getState().hydrate(null);
  });

  it('默认竖屏、自动缩放', () => {
    const state = useSimulatorStore.getState();
    expect(state.orientation).toBe('portrait');
    expect(state.zoomMode).toBe('auto');
  });

  it('切换方向在竖屏与横屏之间往返', () => {
    useSimulatorStore.getState().toggleOrientation();
    expect(useSimulatorStore.getState().orientation).toBe('landscape');
    useSimulatorStore.getState().toggleOrientation();
    expect(useSimulatorStore.getState().orientation).toBe('portrait');
  });

  it('步进缩放会切换到手动模式', () => {
    useSimulatorStore.getState().stepScale(1);
    const state = useSimulatorStore.getState();
    expect(state.zoomMode).toBe('manual');
    expect(state.manualScale).toBeCloseTo(0.7, 5);
  });

  it('手动缩放被限制在 10% 到 300%', () => {
    useSimulatorStore.getState().setManualScale(0.001);
    expect(useSimulatorStore.getState().manualScale).toBeCloseTo(0.1, 5);
    useSimulatorStore.getState().setManualScale(99);
    expect(useSimulatorStore.getState().manualScale).toBeCloseTo(3, 5);
  });

  it('hydrate 恢复已保存的 URL 与缩放', () => {
    useSimulatorStore.getState().hydrate({
      url: 'http://localhost:3000',
      orientation: 'landscape',
      zoomMode: 'manual',
      manualScale: 1.2,
    });
    const state = useSimulatorStore.getState();
    expect(state.url).toBe('http://localhost:3000');
    expect(state.orientation).toBe('landscape');
    expect(state.manualScale).toBeCloseTo(1.2, 5);
  });
});
