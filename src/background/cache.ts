import type { StorageLike } from "../shared/types.ts";

export interface DistanceCacheEntry {
  meters: number;
  minutes: number;
  fetchedAt: number;
}

export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
  cacheKey: string;
}

export const DEFAULT_DISTANCE_CACHE_STORAGE_KEY = "distanceCache";

export class DistanceCache {
  readonly #storage: StorageLike;
  readonly #opts: CacheOptions;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(storage: StorageLike, opts: Omit<CacheOptions, "cacheKey"> & { cacheKey?: string }) {
    this.#storage = storage;
    this.#opts = {
      ttlMs: opts.ttlMs,
      maxEntries: opts.maxEntries,
      cacheKey: opts.cacheKey ?? DEFAULT_DISTANCE_CACHE_STORAGE_KEY,
    };
  }

  get count(): Promise<number> {
    return this.loadAll().then((all) => Object.keys(all).length);
  }

  get(key: string): Promise<DistanceCacheEntry | null> {
    return this.enqueue(async () => {
      const all = await this.loadAll();
      const entry = all[key];
      if (!entry) return null;
      if (Date.now() - entry.fetchedAt > this.#opts.ttlMs) {
        delete all[key];
        await this.saveAll(all);
        return null;
      }
      return entry;
    });
  }

  set(key: string, entry: DistanceCacheEntry): Promise<void> {
    return this.enqueue(async () => {
      const all = await this.loadAll();
      all[key] = entry;
      const entries = Object.entries(all);
      if (entries.length > this.#opts.maxEntries) {
        entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
        const trimmed = Object.fromEntries(entries.slice(entries.length - this.#opts.maxEntries));
        await this.saveAll(trimmed);
        return;
      }
      await this.saveAll(all);
    });
  }

  clear(): Promise<void> {
    return this.#storage.remove(this.#opts.cacheKey);
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.#queue.then(fn, fn);
    this.#queue = next.catch(() => undefined);
    return next;
  }

  private async loadAll(): Promise<Record<string, DistanceCacheEntry>> {
    const got = await this.#storage.get(this.#opts.cacheKey);
    const raw = got[this.#opts.cacheKey];
    return (raw as Record<string, DistanceCacheEntry>) ?? {};
  }

  private async saveAll(data: Record<string, DistanceCacheEntry>): Promise<void> {
    await this.#storage.set({ [this.#opts.cacheKey]: data });
  }
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const CACHE_MAX_ENTRIES = 500;

export const distanceCache = new DistanceCache(
  {
    get: (key) => chrome.storage.local.get(key),
    set: (obj) => chrome.storage.local.set(obj),
    remove: (key) => chrome.storage.local.remove(key),
  },
  {
    ttlMs: CACHE_TTL_MS,
    maxEntries: CACHE_MAX_ENTRIES,
    cacheKey: DEFAULT_DISTANCE_CACHE_STORAGE_KEY,
  },
);
