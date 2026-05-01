import { beforeEach, describe, expect, it } from "vitest";
import { type MockStorage, makeMockStorage } from "../../test/helper.ts";
import { TtlCache, type TtlCacheEntry } from "./ttl-cache.ts";

type TData = Record<string, string>;

describe("TtlCache", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = makeMockStorage();
  });

  it("stores and retrieves an entry", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 10_000,
      maxEntries: 100,
      storageKey: "ttlCache",
    });
    const entry = { data: { k: "v" }, fetchedAt: Date.now() } satisfies TtlCacheEntry<TData>;
    await cache.set("k1", entry);
    const got = await cache.get("a→b");
    expect(got).toEqual(entry);
  });

  it("returns entries count", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 10_000,
      maxEntries: 100,
      storageKey: "ttlCache",
    });
    const entry = { data: { k: "v" }, fetchedAt: Date.now() } satisfies TtlCacheEntry<TData>;
    await cache.set("k1", entry);
    await cache.set("k2", entry);
    const got = await cache.count;
    expect(got).toEqual(2);
  });

  it("returns null for missing keys", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 10_000,
      maxEntries: 100,
      storageKey: "ttlCache",
    });
    expect(await cache.get("missing")).toBeNull();
  });

  it("evicts expired entries on read", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 1000,
      maxEntries: 100,
      storageKey: "ttlCache",
    });
    const entry = { data: { k: "v" }, fetchedAt: Date.now() - 5000 } satisfies TtlCacheEntry<TData>;
    await cache.set("k1", entry);
    expect(await cache.get("k1")).toBeNull();
  });

  it("keeps both entries when set calls overlap", async () => {
    const backing: Record<string, unknown> = {};
    const asyncStorage = {
      get: vi.fn(async (key: string) => {
        await Promise.resolve();
        return { [key]: backing[key] };
      }),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        await Promise.resolve();
        Object.assign(backing, obj);
      }),
      remove: vi.fn(async () => {
        return Promise.resolve();
      }),
    };
    const cache = new TtlCache<TData>(asyncStorage, {
      ttlMs: 10_000,
      maxEntries: 100,
      storageKey: "ttlCache",
    });
    const now = Date.now();
    await Promise.all([
      cache.set("k1", { data: { k: "v" }, fetchedAt: now }),
      cache.set("k2", { data: { k: "v" }, fetchedAt: now }),
    ]);
    expect(await cache.get("k1")).not.toBeNull();
    expect(await cache.get("k2")).not.toBeNull();
  });

  it("evicts oldest entries when over maxEntries", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 1_000_000,
      maxEntries: 3,
      storageKey: "ttlCache",
    });
    const now = Date.now();
    await cache.set("k1", { data: { k: "v" }, fetchedAt: now - 3000 });
    await cache.set("k2", { data: { k: "v" }, fetchedAt: now - 2000 });
    await cache.set("k3", { data: { k: "v" }, fetchedAt: now - 1000 });
    await cache.set("k4", { data: { k: "v" }, fetchedAt: now });
    expect(await cache.get("k1")).toBeNull();
    expect(await cache.get("k4")).not.toBeNull();
  });

  it("clears all entries", async () => {
    const cache = new TtlCache<TData>(storage, {
      ttlMs: 1_000_000,
      maxEntries: 3,
      storageKey: "ttlCache",
    });
    const entry = { data: { k: "v" }, fetchedAt: Date.now() } satisfies TtlCacheEntry<TData>;
    await cache.set("k1", entry);
    let got = await cache.count;
    expect(got).toEqual(1);
    await cache.clear();
    got = await cache.count;
    expect(got).toEqual(0);
  });
});
