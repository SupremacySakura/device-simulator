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
      'Preview responsive pages with accurate CSS viewports, safe areas, cameras, and device frames.',
    permissions: ['storage', 'activeTab', 'scripting'],
    web_accessible_resources: [
      {
        resources: ['simulator.html'],
        matches: ['http://*/*', 'https://*/*'],
        use_dynamic_url: true,
      },
    ],
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
