import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'Device Simulator',
    description:
      'Preview any page at a real device viewport, with accurate media queries and safe areas.',
    permissions: ['storage', 'activeTab', 'scripting'],
    action: {
      default_title: 'Device Simulator',
    },
    // 独立入口：右键扩展图标 → 选项，用于预览还没打开的地址。
    options_ui: {
      page: 'simulator.html',
      open_in_tab: true,
    },
    browser_specific_settings: {
      gecko: {
        id: 'device-simulator@example.local',
        strict_min_version: '109.0',
        data_collection_permissions: {
          required: ['none'],
        },
      },
    },
  },
});
