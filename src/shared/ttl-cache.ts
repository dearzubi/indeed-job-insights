import type { StorageLike } from "./types.ts";

export interface TtlCacheEntry<TData> {
  fetchedAt: number;
  data: TData;
}

export interface TtlCacheOptions {
  ttlMs: number;
  maxEntries: number;
  storageKey: string;
}

export class TtlCache<TData> {
  readonly #storage: StorageLike;
  readonly #opts: TtlCacheOptions;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(storage: StorageLike, opts: TtlCacheOptions) {
    this.#storage = storage;
    this.#opts = opts;
  }

  get count(): Promise<number> {
    return this.#loadAll().then((all) => Object.keys(all).length);
  }

  get(key: string): Promise<TtlCacheEntry<TData> | null> {
    return this.#enqueue(async () => {
      const all = await this.#loadAll();
      const entry = all[key];
      if (!entry) return null;
      if (Date.now() - entry.fetchedAt > this.#opts.ttlMs) {
        delete all[key];
        await this.#saveAll(all);
        return null;
      }
      return entry;
    });
  }

  set(key: string, entry: TtlCacheEntry<TData>): Promise<void> {
    return this.#enqueue(async () => {
      const all = await this.#loadAll();
      all[key] = entry;
      const entries = Object.entries(all);
      if (entries.length > this.#opts.maxEntries) {
        entries.sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
        const trimmed = Object.fromEntries(entries.slice(entries.length - this.#opts.maxEntries));
        await this.#saveAll(trimmed);
        return;
      }
      await this.#saveAll(all);
    });
  }

  clear(): Promise<void> {
    return this.#storage.remove(this.#opts.storageKey);
  }

  #enqueue<R>(fn: () => Promise<R>): Promise<R> {
    const next = this.#queue.then(fn, fn);
    this.#queue = next.catch(() => undefined);
    return next;
  }

  async #loadAll(): Promise<Record<string, TtlCacheEntry<TData>>> {
    const got = await this.#storage.get(this.#opts.storageKey);
    const raw = got[this.#opts.storageKey];
    return (raw as Record<string, TtlCacheEntry<TData>>) ?? {};
  }

  async #saveAll(data: Record<string, TtlCacheEntry<TData>>): Promise<void> {
    await this.#storage.set({ [this.#opts.storageKey]: data });
  }
}
