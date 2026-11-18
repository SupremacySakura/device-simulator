import { describe, expect, it, vi } from 'vitest';
import { DebuggerAttachError, createCdpClient, type CdpSender } from '../services/cdp-service';

interface FakeSender {
  attach: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
  sendCommand: ReturnType<typeof vi.fn>;
}

function fakeSender(overrides: Partial<CdpSender> = {}): CdpSender & FakeSender {
  return {
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined),
    sendCommand: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as CdpSender & FakeSender;
}

const metrics = {
  width: 393,
  height: 852,
  deviceScaleFactor: 3,
  scale: 0.6,
  mobile: true,
  screenOrientation: { type: 'portraitPrimary' as const, angle: 0 },
};

describe('cdp client', () => {
  it('附加成功后应用设备指标与安全区', async () => {
    const sender = fakeSender();
    const client = createCdpClient(sender);

    await client.attach(7);
    await client.applyEmulation(7, metrics, { top: 59, right: 0, bottom: 34, left: 0 });

    expect(sender.attach).toHaveBeenCalledWith({ tabId: 7 }, '1.3');
    expect(sender.sendCommand).toHaveBeenCalledWith(
      { tabId: 7 },
      'Emulation.setDeviceMetricsOverride',
      expect.objectContaining({ width: 393, height: 852, deviceScaleFactor: 3, scale: 0.6 }),
    );
    expect(sender.sendCommand).toHaveBeenCalledWith(
      { tabId: 7 },
      'Emulation.setSafeAreaInsetsOverride',
      { insets: { top: 59, right: 0, bottom: 34, left: 0 } },
    );
  });

  it('零安全区显式归零，避免上一台设备的刘海残留', async () => {
    const sender = fakeSender();
    const client = createCdpClient(sender);

    await client.applyEmulation(7, metrics, null);

    expect(sender.sendCommand).toHaveBeenCalledWith(
      { tabId: 7 },
      'Emulation.setSafeAreaInsetsOverride',
      { insets: { top: 0, right: 0, bottom: 0, left: 0 } },
    );
  });

  it('DevTools 占用时给出可操作的中文提示', async () => {
    const sender = fakeSender({
      attach: vi.fn().mockRejectedValue(new Error('Another debugger is already attached')),
    });
    const client = createCdpClient(sender);

    await expect(client.attach(7)).rejects.toBeInstanceOf(DebuggerAttachError);
    await expect(client.attach(7)).rejects.toThrow('请先关闭此页面的 DevTools');
  });

  it('浏览器内部页面给出换页提示', async () => {
    const sender = fakeSender({
      attach: vi.fn().mockRejectedValue(new Error('Cannot access a chrome:// URL')),
    });
    await expect(createCdpClient(sender).attach(1)).rejects.toThrow('浏览器内部页面不允许调试');
  });

  it('分离失败不抛错，避免关闭流程被卡住', async () => {
    const sender = fakeSender({ detach: vi.fn().mockRejectedValue(new Error('no target')) });
    await expect(createCdpClient(sender).detach(7)).resolves.toBeUndefined();
  });
});
