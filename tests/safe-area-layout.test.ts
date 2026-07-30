import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DeviceScreen } from '../components/simulator/DeviceScreen';
import type { DeviceViewportConfig } from '../types/device';
import { getDeviceContentRect } from '../utils/safe-area-layout';

function viewport(overrides: Partial<DeviceViewportConfig> = {}): DeviceViewportConfig {
  return {
    width: 430,
    height: 932,
    screenBorderRadius: 55,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    cameras: [],
    displayFeatures: [],
    ...overrides,
  };
}

describe('getDeviceContentRect', () => {
  it('reserves every safe-area edge outside the page content flow', () => {
    expect(
      getDeviceContentRect(viewport({ safeArea: { top: 59, right: 21, bottom: 34, left: 13 } })),
    ).toEqual({ x: 13, y: 59, width: 396, height: 839 });
  });

  it('does not reserve camera space a second time when the camera is inside the safe area', () => {
    const contentRect = getDeviceContentRect(
      viewport({
        cameras: [
          {
            id: 'dynamic-island',
            name: '灵动岛',
            position: {
              mode: 'anchor',
              horizontal: 'center',
              vertical: 'top',
              offsetX: 0,
              offsetY: 11,
            },
            width: 125,
            height: 37,
            shape: 'rounded-rect',
            borderRadius: 19,
            layoutMode: 'occupy',
            visible: true,
          },
        ],
      }),
    );

    expect(contentRect).toEqual({ x: 0, y: 59, width: 430, height: 839 });
  });

  it('places the iframe flow inside the safe content rectangle even when guides are hidden', () => {
    const html = renderToStaticMarkup(
      createElement(DeviceScreen, {
        viewport: viewport({ safeArea: { top: 59, right: 21, bottom: 34, left: 13 } }),
        url: '',
        reloadKey: 0,
        iframeStatus: 'idle',
        iframeMessage: '',
        scale: 1,
        showSafeArea: false,
        selectedCameraId: null,
        selectedFeatureId: null,
        editable: false,
        dragging: false,
        onStatusChange: () => undefined,
        onReload: () => undefined,
        onSelectCamera: () => undefined,
        onSelectFeature: () => undefined,
        onMoveCamera: () => undefined,
        onDeleteCamera: () => undefined,
        onDraggingChange: () => undefined,
        onClearSelection: () => undefined,
      }),
    );

    expect(html).toContain('data-device-content-viewport="true"');
    expect(html).toContain('left:13px;top:59px;width:396px;height:839px');
  });
});
