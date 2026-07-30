import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CompareDeviceLibrary } from '../components/compare/CompareDeviceLibrary';
import { DeviceListItem } from '../components/device/DeviceListItem';
import { SYSTEM_DEVICES } from '../constants/default-devices';

const foldable = SYSTEM_DEVICES.find((device) => device.id === 'surface-duo-spanned');

if (foldable === undefined) throw new Error('Missing foldable test device.');

describe('foldable device category icon', () => {
  it('uses the foldable icon in the main device list', () => {
    const html = renderToStaticMarkup(
      createElement(DeviceListItem, {
        device: foldable,
        active: false,
        onSelect: () => undefined,
        onFavorite: () => undefined,
        onEdit: () => undefined,
        onDuplicate: () => undefined,
        onExport: () => undefined,
        onDelete: () => undefined,
      }),
    );

    expect(html).toContain('lucide-tablets');
  });

  it('uses the foldable icon in the compare device library', () => {
    const html = renderToStaticMarkup(
      createElement(CompareDeviceLibrary, {
        devices: [foldable],
        recentDeviceIds: [],
        addedCounts: {},
        query: '',
        category: 'all',
        onQueryChange: () => undefined,
        onCategoryChange: () => undefined,
        onAdd: () => undefined,
        onToggleFavorite: () => undefined,
        showFilters: false,
      }),
    );

    expect(html).toContain('data-device-library-id="surface-duo-spanned"');
    expect(html).toContain('lucide-tablets');
  });
});
