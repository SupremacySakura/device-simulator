import { browser } from 'wxt/browser';
import { openSimulatorInCurrentTab } from '../services/message-service';
import { isExtensionMessage } from '../utils/message';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown) => {
    if (!isExtensionMessage(message)) return;
    if (message.type === 'PING') {
      void browser.runtime.sendMessage({ type: 'PONG' as const }).catch(() => undefined);
      return;
    }
    if (message.type === 'OPEN_SIMULATOR') {
      const query = new URLSearchParams();
      const { url, deviceId } = message.payload;
      if (url) {
        void browser.tabs
          .query({ active: true, currentWindow: true })
          .then(async ([tab]) => {
            if (tab?.id === undefined) throw new Error('找不到当前标签页。');
            await openSimulatorInCurrentTab({
              tabId: tab.id,
              url,
              ...(deviceId ? { deviceId } : {}),
            });
          })
          .catch((error: unknown) => {
            console.warn('[background] Unable to inject simulator', error);
          });
        return;
      }
      if (deviceId) query.set('device', deviceId);
      query.set('blank', '1');
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      const simulatorUrl = `${browser.runtime.getURL('/simulator.html')}${suffix}`;
      void browser.tabs.create({ url: simulatorUrl }).catch((error: unknown) => {
        console.warn('[background] Unable to open simulator', error);
      });
    }
  });
});
