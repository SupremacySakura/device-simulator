import { browser } from 'wxt/browser';
import { isExtensionMessage } from '../utils/message';

export default defineContentScript({
  matches: ['http://localhost/*', 'http://127.0.0.1/*'],
  runAt: 'document_start',
  main() {
    document.documentElement.dataset.deviceSimulatorBridge = 'ready';

    browser.runtime.onMessage.addListener((message: unknown) => {
      if (!isExtensionMessage(message)) return;
      if (message.type === 'PING') return;
      if (message.type === 'SET_DEVICE_CONTEXT') {
        document.documentElement.dataset.deviceSimulatorOrientation = message.payload.orientation;
        return;
      }
      if (message.type === 'SET_SAFE_AREA') {
        const root = document.documentElement.style;
        root.setProperty('--device-safe-area-top', `${message.payload.top}px`);
        root.setProperty('--device-safe-area-right', `${message.payload.right}px`);
        root.setProperty('--device-safe-area-bottom', `${message.payload.bottom}px`);
        root.setProperty('--device-safe-area-left', `${message.payload.left}px`);
        return;
      }
    });
  },
});
