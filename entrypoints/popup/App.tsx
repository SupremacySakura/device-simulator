import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Globe2,
  History,
  LoaderCircle,
  Monitor,
  ShieldAlert,
  Smartphone,
  Tablet,
  TabletSmartphone,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/ToastProvider';
import { useStorageReady } from '../../hooks/use-storage-ready';
import {
  getActiveTabInfo,
  openSimulator,
  openSimulatorInCurrentTab,
  type ActiveTabInfo,
} from '../../services/message-service';
import { useDeviceStore } from '../../stores/device-store';
import { useHistoryStore, type RecentUrl } from '../../stores/history-store';
import type { DeviceCategory, DeviceProfile } from '../../types/device';

interface LaunchOptions {
  url?: string;
  deviceId?: string;
  title?: string;
  blank?: boolean;
  inPlaceTabId?: number;
}

const DEVICE_ICON: Record<DeviceCategory, ReactNode> = {
  phone: <Smartphone aria-hidden="true" className="size-4" />,
  tablet: <Tablet aria-hidden="true" className="size-4" />,
  desktop: <Monitor aria-hidden="true" className="size-4" />,
  foldable: <TabletSmartphone aria-hidden="true" className="size-4" />,
  custom: <Smartphone aria-hidden="true" className="size-4" />,
};

function readableLocation(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function CurrentPageCard({ loading, tab }: { loading: boolean; tab: ActiveTabInfo | null }) {
  if (loading) {
    return (
      <div
        id="current-page-status"
        className="flex min-h-[82px] items-center gap-3 rounded-xl border border-[#e7e7ec] bg-[#fafafd] px-3.5"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="ds-spinner size-5 text-[#6547f5]" />
        <span className="text-sm text-[#70717a]">正在读取当前标签页…</span>
      </div>
    );
  }

  if (tab === null) {
    return (
      <div
        id="current-page-status"
        className="flex min-h-[82px] items-start gap-3 rounded-xl border border-[#eee1bd] bg-[#fffcf3] px-3.5 py-3"
        role="status"
      >
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[#a66a12]" />
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium text-[#39352d]">无法读取当前标签页</p>
          <p className="mt-1 mb-0 text-xs leading-5 text-[#7d6c52]">
            仍可打开空白模拟器，再手动输入页面地址。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="current-page-status"
      className={`min-h-[82px] rounded-xl border px-3.5 py-3 ${
        tab.simulatable ? 'border-[#e4e2f2] bg-[#faf9ff]' : 'border-[#eee1bd] bg-[#fffcf3]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-lg ${
            tab.simulatable ? 'bg-[#eeeaff] text-[#5d3ff0]' : 'bg-[#fff2cd] text-[#9a6518]'
          }`}
        >
          {tab.simulatable ? (
            <Globe2 aria-hidden="true" className="size-[18px]" />
          ) : (
            <ShieldAlert aria-hidden="true" className="size-[18px]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className="m-0 min-w-0 flex-1 truncate text-sm font-semibold text-[#25252b]"
              title={tab.title}
            >
              {tab.title}
            </p>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                tab.simulatable ? 'bg-[#e7f7ef] text-[#24724e]' : 'bg-[#fff0c7] text-[#8b5b14]'
              }`}
            >
              {tab.simulatable ? '可模拟' : '受限制'}
            </span>
          </div>
          <p
            dir="ltr"
            className="mt-1 mb-0 truncate text-left text-xs text-[#74757e]"
            title={tab.url}
          >
            {tab.url}
          </p>
          {!tab.simulatable ? (
            <p className="mt-1 mb-0 text-[11px] text-[#8b704a]">
              浏览器内部页与扩展页不能在 iframe 中模拟。
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  id,
  icon,
  children,
  action,
}: {
  id: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-2 flex h-5 items-center gap-1.5">
      <span className="text-[#777882]">{icon}</span>
      <h2 id={id} className="m-0 text-xs font-semibold tracking-wide text-[#45464e]">
        {children}
      </h2>
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

function EmptyRecent({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-[58px] place-items-center rounded-xl border border-dashed border-[#dedee6] bg-[#fbfbfc] px-3 text-center text-xs text-[#898a92]">
      {children}
    </div>
  );
}

export function App() {
  const { ready, error: storageError } = useStorageReady();
  const { showToast } = useToast();
  const devices = useDeviceStore((state) => state.devices);
  const currentDeviceId = useDeviceStore((state) => state.currentDeviceId);
  const recentUrls = useHistoryStore((state) => state.recentUrls);
  const recentDeviceIds = useHistoryStore((state) => state.recentDeviceIds);
  const combinations = useHistoryStore((state) => state.combinations);
  const recordUrl = useHistoryStore((state) => state.recordUrl);
  const recordDevice = useHistoryStore((state) => state.recordDevice);
  const recordCombination = useHistoryStore((state) => state.recordCombination);
  const clearAll = useHistoryStore((state) => state.clearAll);
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null);
  const [tabLoading, setTabLoading] = useState(true);
  const [openingKey, setOpeningKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    void getActiveTabInfo().then((tab) => {
      if (!active) return;
      setActiveTab(tab);
      setTabLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const recentDevices = useMemo(
    () =>
      recentDeviceIds
        .map((id) => devices.find((device) => device.id === id))
        .filter((device): device is DeviceProfile => device !== undefined)
        .slice(0, 3),
    [devices, recentDeviceIds],
  );
  const recentPages = useMemo(() => recentUrls.slice(0, 3), [recentUrls]);
  const historyIsEmpty = recentDeviceIds.length === 0 && recentUrls.length === 0;

  function deviceForUrl(url: string): string {
    const lastCombination = combinations.find(
      (combination) =>
        combination.url === url && devices.some((device) => device.id === combination.deviceId),
    );
    return lastCombination?.deviceId ?? currentDeviceId;
  }

  async function launch(options: LaunchOptions, key: string): Promise<void> {
    if (!ready || openingKey !== null) return;
    setOpeningKey(key);
    setActionError('');

    try {
      if (options.url) recordUrl(options.url, options.title);
      if (options.deviceId) recordDevice(options.deviceId);
      if (options.url && options.deviceId) recordCombination(options.url, options.deviceId);

      // Store writes are debounced. Let the popup persist history before the
      // newly created active tab causes the popup document to be destroyed.
      if (options.url || options.deviceId) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 220));
      }

      if (options.inPlaceTabId !== undefined && options.url) {
        await openSimulatorInCurrentTab({
          tabId: options.inPlaceTabId,
          url: options.url,
          ...(options.deviceId ? { deviceId: options.deviceId } : {}),
        });
        window.close();
      } else {
        await openSimulator({
          ...(options.url ? { url: options.url } : {}),
          ...(options.deviceId ? { deviceId: options.deviceId } : {}),
          ...(options.blank ? { blank: true } : {}),
        });
      }
      setOpeningKey(null);
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : '无法打开设备模拟器。';
      setActionError(message);
      showToast('无法打开设备模拟器，请重试。', 'error');
      setOpeningKey(null);
    }
  }

  function openCurrentPage(): void {
    if (!activeTab?.simulatable) return;
    void launch(
      {
        url: activeTab.url,
        title: activeTab.title,
        inPlaceTabId: activeTab.id,
        ...(currentDeviceId ? { deviceId: currentDeviceId } : {}),
      },
      'current-page',
    );
  }

  function openBlankSimulator(): void {
    void launch(
      {
        blank: true,
        ...(currentDeviceId ? { deviceId: currentDeviceId } : {}),
      },
      'blank',
    );
  }

  function openRecentPage(page: RecentUrl): void {
    const deviceId = deviceForUrl(page.url);
    void launch(
      {
        url: page.url,
        ...(activeTab?.id !== undefined ? { inPlaceTabId: activeTab.id } : {}),
        ...(page.title ? { title: page.title } : {}),
        ...(deviceId ? { deviceId } : {}),
      },
      `url:${page.url}`,
    );
  }

  function clearHistory(): void {
    clearAll();
    showToast('最近记录已清空。', 'info');
  }

  const pageUnavailable = tabLoading || !activeTab?.simulatable;
  const actionsDisabled = !ready || openingKey !== null;

  return (
    <main
      className="flex h-[520px] w-[380px] flex-col overflow-hidden bg-[#f7f7fa] text-[#202127]"
      aria-busy={!ready || tabLoading}
    >
      <header className="flex h-[66px] shrink-0 items-center border-b border-[#e7e7ec] bg-white px-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#6547f5] text-white shadow-[0_5px_16px_rgba(101,71,245,.24)]">
          <TabletSmartphone aria-hidden="true" className="size-[21px]" />
        </span>
        <div className="ml-3 min-w-0">
          <h1 className="m-0 text-[15px] font-semibold tracking-[-0.01em]">Device Simulator</h1>
          <p className="mt-0.5 mb-0 text-[11px] text-[#7a7b84]">响应式设备与安全区调试</p>
        </div>
        <span className="ml-auto rounded-full border border-[#e7e7ec] bg-[#f6f6f8] px-2 py-1 text-[10px] font-medium text-[#686972]">
          v1.0.0
        </span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
        {storageError ? (
          <div
            className="mb-3 rounded-lg border border-[#f3d0d0] bg-[#fff5f5] px-3 py-2 text-xs text-[#a33b3b]"
            role="alert"
          >
            本地配置加载失败，将使用默认设置。{storageError}
          </div>
        ) : null}

        <section aria-labelledby="current-page-heading">
          <SectionTitle
            id="current-page-heading"
            icon={<Globe2 aria-hidden="true" className="size-3.5" />}
          >
            当前页面
          </SectionTitle>
          <CurrentPageCard loading={tabLoading} tab={activeTab} />
        </section>

        <div className="mt-2.5 grid grid-cols-[1fr_132px] gap-2">
          <Button
            variant="primary"
            className="h-10 min-w-0 px-3"
            loading={openingKey === 'current-page'}
            disabled={actionsDisabled || pageUnavailable}
            aria-describedby={pageUnavailable ? 'current-page-status' : undefined}
            onClick={openCurrentPage}
          >
            {openingKey !== 'current-page' ? (
              <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
            <span className="truncate">在当前页中模拟</span>
          </Button>
          <Button
            className="h-10 px-2.5"
            loading={openingKey === 'blank'}
            disabled={actionsDisabled}
            aria-label="打开空白设备模拟器"
            onClick={openBlankSimulator}
          >
            {openingKey !== 'blank' ? <ArrowUpRight aria-hidden="true" className="size-4" /> : null}
            空白模拟器
          </Button>
        </div>

        {actionError ? (
          <p className="mt-2 mb-0 text-xs text-[#bd3636]" role="alert">
            {actionError}
          </p>
        ) : null}

        <section className="mt-4" aria-labelledby="recent-devices-heading">
          <SectionTitle
            id="recent-devices-heading"
            icon={<Smartphone aria-hidden="true" className="size-3.5" />}
          >
            最近设备
          </SectionTitle>
          {!ready ? (
            <EmptyRecent>正在加载设备记录…</EmptyRecent>
          ) : recentDevices.length === 0 ? (
            <EmptyRecent>使用过的设备会显示在这里</EmptyRecent>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {recentDevices.map((device) => {
                const key = `device:${device.id}`;
                return (
                  <button
                    key={device.id}
                    type="button"
                    className="group flex h-[66px] min-w-0 flex-col items-start justify-between rounded-xl border border-[#e3e3e9] bg-white px-2.5 py-2 text-left transition hover:border-[#cfc8f7] hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-55"
                    disabled={actionsDisabled}
                    aria-label={`使用 ${device.name} 模拟当前页面`}
                    title={device.name}
                    onClick={() =>
                      void launch(
                        activeTab?.simulatable
                          ? {
                              deviceId: device.id,
                              url: activeTab.url,
                              inPlaceTabId: activeTab.id,
                            }
                          : { deviceId: device.id, blank: true },
                        key,
                      )
                    }
                  >
                    <span className="flex w-full items-center gap-1.5 text-[#6547f5]">
                      {openingKey === key ? (
                        <LoaderCircle aria-hidden="true" className="ds-spinner size-4" />
                      ) : (
                        DEVICE_ICON[device.category]
                      )}
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#3c3d45]">
                        {device.name}
                      </span>
                    </span>
                    <span className="text-[10px] tabular-nums text-[#85868f]">
                      {device.portrait.width} × {device.portrait.height}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-4" aria-labelledby="recent-pages-heading">
          <SectionTitle
            id="recent-pages-heading"
            icon={<History aria-hidden="true" className="size-3.5" />}
            action={
              !historyIsEmpty ? (
                <button
                  type="button"
                  className="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-[#777882] transition hover:bg-[#ededf2] hover:text-[#4f3bd4]"
                  aria-label="清空最近设备与页面记录"
                  title="清空最近记录"
                  disabled={actionsDisabled}
                  onClick={clearHistory}
                >
                  <Trash2 aria-hidden="true" className="size-3" />
                  清空
                </button>
              ) : null
            }
          >
            最近页面
          </SectionTitle>
          {!ready ? (
            <EmptyRecent>正在加载页面记录…</EmptyRecent>
          ) : recentPages.length === 0 ? (
            <EmptyRecent>模拟过的页面会显示在这里</EmptyRecent>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#e3e3e9] bg-white">
              {recentPages.map((page, index) => {
                const key = `url:${page.url}`;
                return (
                  <button
                    key={page.url}
                    type="button"
                    className={`flex h-[46px] w-full items-center gap-2.5 px-3 text-left transition hover:bg-[#faf9ff] disabled:cursor-not-allowed disabled:opacity-55 ${
                      index > 0 ? 'border-t border-[#eeeeF2]' : ''
                    }`}
                    disabled={actionsDisabled}
                    aria-label={`再次模拟 ${page.title || page.url}`}
                    title={page.url}
                    onClick={() => openRecentPage(page)}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#f1efff] text-[#6547f5]">
                      {openingKey === key ? (
                        <LoaderCircle aria-hidden="true" className="ds-spinner size-3.5" />
                      ) : (
                        <Clock3 aria-hidden="true" className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-[#36373e]">
                        {page.title || readableLocation(page.url)}
                      </span>
                      <span dir="ltr" className="mt-0.5 block truncate text-[10px] text-[#888992]">
                        {page.url}
                      </span>
                    </span>
                    <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-[#aaabb2]" />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
