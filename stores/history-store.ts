import { create } from 'zustand';
import { tryNormalizeUrl } from '../utils/url';

export interface RecentUrl {
  url: string;
  title?: string;
  visitedAt: number;
}

export interface DeviceUrlCombination {
  url: string;
  deviceId: string;
  usedAt: number;
}

export interface PersistedHistoryData {
  recentUrls: RecentUrl[];
  recentDeviceIds: string[];
  combinations: DeviceUrlCombination[];
}

interface HistoryStoreState extends PersistedHistoryData {
  hydrated: boolean;
  hydrate: (data: PersistedHistoryData | null) => void;
  recordUrl: (url: string, title?: string) => void;
  recordDevice: (deviceId: string) => void;
  recordCombination: (url: string, deviceId: string) => void;
  clearUrls: () => void;
  clearAll: () => void;
}

const EMPTY_HISTORY: PersistedHistoryData = {
  recentUrls: [],
  recentDeviceIds: [],
  combinations: [],
};

function normalizeHistoryUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const result = tryNormalizeUrl(value);
  return result.success ? result.url : null;
}

function normalizeTitle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const title = value.trim().slice(0, 300);
  return title || undefined;
}

function isFiniteTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonEmptyId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
}

export function sanitizeHistoryData(value: unknown): PersistedHistoryData | null {
  if (typeof value !== 'object' || value === null) return null;
  const candidate = value as Partial<PersistedHistoryData>;
  if (!Array.isArray(candidate.recentUrls) || !Array.isArray(candidate.recentDeviceIds)) {
    return null;
  }

  const recentUrls: RecentUrl[] = [];
  const seenUrls = new Set<string>();
  for (const item of candidate.recentUrls) {
    if (typeof item !== 'object' || item === null) continue;
    const url = normalizeHistoryUrl(Reflect.get(item, 'url'));
    const visitedAt = Reflect.get(item, 'visitedAt');
    const rawTitle = Reflect.get(item, 'title');
    if (
      !url ||
      seenUrls.has(url) ||
      !isFiniteTimestamp(visitedAt) ||
      (rawTitle !== undefined && typeof rawTitle !== 'string')
    ) {
      continue;
    }
    seenUrls.add(url);
    const title = normalizeTitle(rawTitle);
    recentUrls.push({ url, visitedAt, ...(title ? { title } : {}) });
    if (recentUrls.length === 12) break;
  }

  const recentDeviceIds = Array.from(new Set(candidate.recentDeviceIds.filter(isNonEmptyId))).slice(
    0,
    12,
  );

  const combinations: DeviceUrlCombination[] = [];
  const seenCombinations = new Set<string>();
  if (Array.isArray(candidate.combinations)) {
    for (const item of candidate.combinations) {
      if (typeof item !== 'object' || item === null) continue;
      const url = normalizeHistoryUrl(Reflect.get(item, 'url'));
      const deviceId = Reflect.get(item, 'deviceId');
      const usedAt = Reflect.get(item, 'usedAt');
      if (!url || !isNonEmptyId(deviceId) || !isFiniteTimestamp(usedAt)) continue;
      const key = `${url}\u0000${deviceId}`;
      if (seenCombinations.has(key)) continue;
      seenCombinations.add(key);
      combinations.push({ url, deviceId, usedAt });
      if (combinations.length === 20) break;
    }
  }

  return { recentUrls, recentDeviceIds, combinations };
}

export const useHistoryStore = create<HistoryStoreState>((set) => ({
  ...EMPTY_HISTORY,
  hydrated: false,
  hydrate: (data) => set({ ...(sanitizeHistoryData(data) ?? EMPTY_HISTORY), hydrated: true }),
  recordUrl: (url, title) => {
    const normalizedUrl = normalizeHistoryUrl(url);
    if (!normalizedUrl) return;
    const normalizedTitle = normalizeTitle(title);
    set((state) => {
      const next: RecentUrl = {
        url: normalizedUrl,
        visitedAt: Date.now(),
        ...(normalizedTitle ? { title: normalizedTitle } : {}),
      };
      return {
        recentUrls: [next, ...state.recentUrls.filter((item) => item.url !== normalizedUrl)].slice(
          0,
          12,
        ),
      };
    });
  },
  recordDevice: (deviceId) =>
    set((state) => ({
      recentDeviceIds: [deviceId, ...state.recentDeviceIds.filter((id) => id !== deviceId)].slice(
        0,
        12,
      ),
    })),
  recordCombination: (url, deviceId) => {
    const normalizedUrl = normalizeHistoryUrl(url);
    if (!normalizedUrl || !isNonEmptyId(deviceId)) return;
    set((state) => ({
      combinations: [
        { url: normalizedUrl, deviceId, usedAt: Date.now() },
        ...state.combinations.filter(
          (item) => item.url !== normalizedUrl || item.deviceId !== deviceId,
        ),
      ].slice(0, 20),
    }));
  },
  clearUrls: () => set({ recentUrls: [], combinations: [] }),
  clearAll: () => set({ ...EMPTY_HISTORY }),
}));

export function serializeHistoryStore(state: HistoryStoreState): PersistedHistoryData {
  return {
    recentUrls: state.recentUrls,
    recentDeviceIds: state.recentDeviceIds,
    combinations: state.combinations,
  };
}
