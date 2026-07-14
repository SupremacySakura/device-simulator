import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_COMPARE_DATA,
  serializeCompareStore,
  useCompareStore,
} from '../stores/compare-store';

beforeEach(() => {
  useCompareStore.getState().hydrate({
    ...DEFAULT_COMPARE_DATA,
    instances: [],
    canvasOffset: { ...DEFAULT_COMPARE_DATA.canvasOffset },
  });
});

describe('compare store instances', () => {
  it('adds independent instances that reference the same device profile', () => {
    const store = useCompareStore.getState();
    store.setGlobalUrl('example.com/catalog');

    const firstId = store.addInstance('iphone-15-pro', { position: { x: 10, y: 20 } });
    const secondId = store.addInstance('iphone-15-pro', { position: { x: 100, y: 20 } });
    const state = useCompareStore.getState();

    expect(firstId).not.toBe(secondId);
    expect(state.instances).toHaveLength(2);
    expect(state.instances.map((instance) => instance.deviceId)).toEqual([
      'iphone-15-pro',
      'iphone-15-pro',
    ]);
    expect(state.instances.map((instance) => instance.url)).toEqual([
      'https://example.com/catalog',
      'https://example.com/catalog',
    ]);
    expect(state.selectedInstanceIds).toEqual([secondId]);
  });

  it('duplicates an instance with a new ID and a 40px position offset', () => {
    const store = useCompareStore.getState();
    const sourceId = store.addInstance('google-pixel-8', {
      name: '主设备',
      position: { x: 30, y: 50 },
      orientation: 'landscape',
    });
    const copyId = useCompareStore.getState().duplicateInstance(sourceId);
    const state = useCompareStore.getState();
    const copy = state.instances.find((instance) => instance.id === copyId);

    expect(copyId).not.toBeNull();
    expect(copyId).not.toBe(sourceId);
    expect(copy).toMatchObject({
      deviceId: 'google-pixel-8',
      name: '主设备 副本',
      orientation: 'landscape',
      position: { x: 70, y: 90 },
    });
    expect(state.selectedInstanceIds).toEqual([copyId]);
  });

  it('supports replace, additive and toggle selection before removing selected instances', () => {
    const store = useCompareStore.getState();
    const firstId = store.addInstance('iphone-15-pro');
    const secondId = store.addInstance('google-pixel-8');
    const thirdId = store.addInstance('ipad-pro-11');

    useCompareStore.getState().selectInstance(firstId);
    useCompareStore.getState().selectInstance(secondId, 'add');
    useCompareStore.getState().selectInstance(firstId, 'toggle');
    expect(useCompareStore.getState().selectedInstanceIds).toEqual([secondId]);

    useCompareStore.getState().selectInstances([firstId, thirdId], true);
    useCompareStore.getState().removeSelectedInstances();
    const state = useCompareStore.getState();
    expect(state.instances).toEqual([]);
    expect(state.selectedInstanceIds).toEqual([]);
    expect(state.runtimeByInstanceId).toEqual({});
  });

  it('commits a multi-instance drag as one persistent revision', () => {
    const store = useCompareStore.getState();
    const firstId = store.addInstance('iphone-15-pro');
    const secondId = store.addInstance('google-pixel-8');
    const previousRevision = useCompareStore.getState().persistenceRevision;

    useCompareStore.getState().commitInstancePositions({
      [firstId]: { x: 120, y: 60 },
      [secondId]: { x: 500, y: 80 },
    });
    const state = useCompareStore.getState();

    expect(state.persistenceRevision).toBe(previousRevision + 1);
    expect(state.instances.map((instance) => instance.position)).toEqual([
      { x: 120, y: 60 },
      { x: 500, y: 80 },
    ]);
    expect(state.layoutMode).toBe('free');
  });

  it('keeps iframe node order stable when bringing a selected instance to front', () => {
    const firstId = useCompareStore.getState().addInstance('iphone-15-pro');
    const secondId = useCompareStore.getState().addInstance('google-pixel-8');
    useCompareStore.getState().selectInstances([firstId, secondId]);
    const before = useCompareStore.getState();

    useCompareStore.getState().bringToFront(firstId);
    const after = useCompareStore.getState();

    expect(after.instances).toBe(before.instances);
    expect(after.instances.map((instance) => instance.id)).toEqual([firstId, secondId]);
    expect(after.selectedInstanceIds).toEqual([secondId, firstId]);
    expect(after.persistenceRevision).toBe(before.persistenceRevision);
  });

  it('does not reselect an instance that was toggled off before bringing it to front', () => {
    const firstId = useCompareStore.getState().addInstance('iphone-15-pro');
    const secondId = useCompareStore.getState().addInstance('google-pixel-8');
    useCompareStore.getState().selectInstances([firstId, secondId]);

    useCompareStore.getState().selectInstance(firstId, 'toggle');
    useCompareStore.getState().bringToFront(firstId);

    expect(useCompareStore.getState().selectedInstanceIds).toEqual([secondId]);
  });

  it('ignores an identical URL patch to prevent navigation-sync reload loops', () => {
    const id = useCompareStore
      .getState()
      .addInstance('iphone-15-pro', { url: 'https://example.com/catalog' });
    const before = useCompareStore.getState();

    useCompareStore.getState().updateInstance(id, { url: 'https://example.com/catalog' });
    const after = useCompareStore.getState();

    expect(after.instances).toBe(before.instances);
    expect(after.persistenceRevision).toBe(before.persistenceRevision);
  });

  it('records an observed source navigation without persisting runtime metadata', () => {
    const id = useCompareStore
      .getState()
      .addInstance('iphone-15-pro', { url: 'https://example.com/start' });

    useCompareStore.getState().recordInstanceNavigation(id, 'https://example.com/catalog');
    let state = useCompareStore.getState();
    expect(state.instances[0]?.url).toBe('https://example.com/catalog');
    expect(state.runtimeByInstanceId[id]?.observedUrl).toBe('https://example.com/catalog');
    expect(serializeCompareStore(state)).not.toHaveProperty('runtimeByInstanceId');

    useCompareStore.getState().updateInstance(id, { url: 'https://example.com/checkout' });
    state = useCompareStore.getState();
    expect(state.runtimeByInstanceId[id]?.observedUrl).toBeNull();

    useCompareStore.getState().recordInstanceNavigation(id, 'https://example.com/complete');
    useCompareStore.getState().refreshInstance(id);
    expect(useCompareStore.getState().runtimeByInstanceId[id]?.observedUrl).toBeNull();
  });
});

describe('compare store persistence boundary', () => {
  it('does not mark selection, iframe status or refresh keys as persistent changes', () => {
    const id = useCompareStore.getState().addInstance('iphone-15-pro');
    const persistedRevision = useCompareStore.getState().persistenceRevision;

    useCompareStore.getState().selectInstance(id);
    useCompareStore.getState().setIframeState(id, 'loaded');
    useCompareStore.getState().refreshInstance(id);
    const state = useCompareStore.getState();
    const serialized = serializeCompareStore(state);

    expect(state.persistenceRevision).toBe(persistedRevision);
    expect(state.runtimeByInstanceId[id]).toMatchObject({
      iframeStatus: 'loading',
      reloadKey: 1,
    });
    expect(serialized).not.toHaveProperty('selectedInstanceIds');
    expect(serialized).not.toHaveProperty('runtimeByInstanceId');
    expect(serialized.instances[0]).not.toHaveProperty('iframeStatus');
  });

  it('persists workspace and compare panel state separately from the simulator store', () => {
    const store = useCompareStore.getState();
    store.setWorkspaceMode('compare');
    store.setLeftPanelCollapsed(true);
    store.setRightPanelCollapsed(true);

    expect(serializeCompareStore(useCompareStore.getState())).toMatchObject({
      workspaceMode: 'compare',
      leftPanelCollapsed: true,
      rightPanelCollapsed: true,
    });
  });

  it('applies synchronized orientation and refresh behavior without persisting refresh state', () => {
    const firstId = useCompareStore.getState().addInstance('iphone-15-pro');
    const secondId = useCompareStore.getState().addInstance('google-pixel-8');
    useCompareStore.getState().setSyncOrientationEnabled(true);
    useCompareStore.getState().rotateInstance(firstId);

    expect(useCompareStore.getState().instances.map((instance) => instance.orientation)).toEqual([
      'landscape',
      'landscape',
    ]);

    useCompareStore.getState().setSyncRefreshEnabled(true);
    const revision = useCompareStore.getState().persistenceRevision;
    useCompareStore.getState().refreshInstance(secondId);
    const runtime = useCompareStore.getState().runtimeByInstanceId;
    expect(runtime[firstId]?.reloadKey).toBe(1);
    expect(runtime[secondId]?.reloadKey).toBe(1);
    expect(useCompareStore.getState().persistenceRevision).toBe(revision);
  });

  it('toggles each selected or synchronized instance from its own orientation', () => {
    const firstId = useCompareStore
      .getState()
      .addInstance('iphone-15-pro', { orientation: 'portrait' });
    const secondId = useCompareStore
      .getState()
      .addInstance('google-pixel-8', { orientation: 'landscape' });

    useCompareStore.getState().selectInstances([firstId, secondId]);
    useCompareStore.getState().rotateSelected();
    expect(useCompareStore.getState().instances.map((instance) => instance.orientation)).toEqual([
      'landscape',
      'portrait',
    ]);

    useCompareStore.getState().setSyncOrientationEnabled(true);
    useCompareStore.getState().rotateInstance(firstId);
    expect(useCompareStore.getState().instances.map((instance) => instance.orientation)).toEqual([
      'portrait',
      'landscape',
    ]);
  });

  it('reloads every iframe when loading an unchanged global URL', () => {
    useCompareStore.getState().setGlobalUrl('example.com');
    const firstId = useCompareStore.getState().addInstance('iphone-15-pro');
    const secondId = useCompareStore.getState().addInstance('google-pixel-8');
    const revision = useCompareStore.getState().persistenceRevision;

    useCompareStore.getState().loadGlobalUrl();
    const state = useCompareStore.getState();

    expect(state.runtimeByInstanceId[firstId]?.reloadKey).toBe(1);
    expect(state.runtimeByInstanceId[secondId]?.reloadKey).toBe(1);
    expect(state.persistenceRevision).toBe(revision);
  });
});
