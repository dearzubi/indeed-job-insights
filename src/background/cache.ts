export interface DistanceCacheEntry {
  meters: number;
  minutes: number;
  fetchedAt: number;
}

interface StorageLike {
  get(key: string): Promise<{ [k: string]: unknown }>;
  set(obj: Record<string, unknown>): Promise<void>;
}

export interface CacheOptions {
  ttlMs: number;
  maxEntries: number;
}

const STORAGE_KEY = "distanceCache";

export class DistanceCache {
  constructor(
    private readonly storage: StorageLike,
    private readonly opts: CacheOptions,
  ) {}

  async get(key: string): Promise<DistanceCacheEntry | null> {
    const all = await this.loadAll();
    const entry = all[key];
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > this.opts.ttlMs) {
      delete all[key];
      await this.saveAll(all);
      return null;
    }
    return entry;
  }

  async set(key: string, entry: DistanceCacheEntry): Promise<void> {
    const all = await this.loadAll();
    all[key] = entry;
    const entries = Object.entries(all);
    if (entries.length > this.opts.maxEntries) {
      entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
      const trimmed = Object.fromEntries(entries.slice(entries.length - this.opts.maxEntries));
      await this.saveAll(trimmed);
      return;
    }
    await this.saveAll(all);
  }

  private async loadAll(): Promise<Record<string, DistanceCacheEntry>> {
    const got = await this.storage.get(STORAGE_KEY);
    const raw = got[STORAGE_KEY];
    return (raw as Record<string, DistanceCacheEntry>) ?? {};
  }

  private async saveAll(data: Record<string, DistanceCacheEntry>): Promise<void> {
    await this.storage.set({ [STORAGE_KEY]: data });
  }
}
