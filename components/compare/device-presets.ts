import type { ComparePresetGroup } from './AddDeviceDialog';

export const DEVICE_PRESETS: readonly ComparePresetGroup[] = [
  {
    id: 'mobile-basic',
    name: '移动端基础组合',
    description: '紧凑 iPhone、主流 iPhone 与 Android',
    deviceIds: ['iphone-se-3rd-generation', 'iphone-15-pro', 'google-pixel-8'],
  },
  {
    id: 'ios',
    name: 'iOS 组合',
    description: 'iPhone SE、iPhone 15 Pro 与 iPad Pro 11"',
    deviceIds: ['iphone-se-3rd-generation', 'iphone-15-pro', 'ipad-pro-11'],
  },
  {
    id: 'android',
    name: 'Android 组合',
    description: 'Pixel 8 与 Galaxy S24',
    deviceIds: ['google-pixel-8', 'samsung-galaxy-s24'],
  },
  {
    id: 'responsive',
    name: '响应式常用组合',
    description: '手机、平板、1280 与 1440 桌面断点',
    deviceIds: [
      'iphone-se-3rd-generation',
      'iphone-15-pro',
      'google-pixel-8',
      'ipad-pro-11',
      'desktop-1280x720',
      'desktop-1440x900',
    ],
  },
];
