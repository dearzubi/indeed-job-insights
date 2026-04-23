import { beforeEach, describe, expect, it, vi } from "vitest";
import { DistanceCache, type DistanceCacheEntry } from "./cache.ts";

function makeMockStorage() {
  const backing: Record<string, unknown> = {};
  return {
    backing,
    get: vi.fn((key: string) => Promise.resolve({ [key]: backing[key] })),
    set: vi.fn((obj: Record<string, unknown>) => {
      Object.assign(backing, obj);
      return Promise.resolve();
    }),
  };
}

describe("DistanceCache", () => {
  let storage: ReturnType<typeof makeMockStorage>;
  beforeEach(() => {
    storage = makeMockStorage();
  });

  it("stores and retrieves an entry", async () => {
    const cache = new DistanceCache(storage, { ttlMs: 10_000, maxEntries: 100 });
    const entry: DistanceCacheEntry = { meters: 1000, minutes: 10, fetchedAt: Date.now() };
    await cache.set("a→b", entry);
    const got = await cache.get("a→b");
    expect(got).toEqual(entry);
  });

  it("returns null for missing keys", async () => {
    const cache = new DistanceCache(storage, { ttlMs: 10_000, maxEntries: 100 });
    expect(await cache.get("missing")).toBeNull();
  });

  it("evicts expired entries on read", async () => {
    const cache = new DistanceCache(storage, { ttlMs: 1000, maxEntries: 100 });
    await cache.set("a→b", { meters: 1, minutes: 1, fetchedAt: Date.now() - 5000 });
    expect(await cache.get("a→b")).toBeNull();
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
    };
    const cache = new DistanceCache(asyncStorage, { ttlMs: 10_000, maxEntries: 100 });
    const now = Date.now();
    await Promise.all([
      cache.set("k1", { meters: 1, minutes: 1, fetchedAt: now }),
      cache.set("k2", { meters: 2, minutes: 2, fetchedAt: now }),
    ]);
    expect(await cache.get("k1")).not.toBeNull();
    expect(await cache.get("k2")).not.toBeNull();
  });

  it("evicts oldest entries when over maxEntries", async () => {
    const cache = new DistanceCache(storage, { ttlMs: 1_000_000, maxEntries: 3 });
    const now = Date.now();
    await cache.set("k1", { meters: 1, minutes: 1, fetchedAt: now - 3000 });
    await cache.set("k2", { meters: 1, minutes: 1, fetchedAt: now - 2000 });
    await cache.set("k3", { meters: 1, minutes: 1, fetchedAt: now - 1000 });
    await cache.set("k4", { meters: 1, minutes: 1, fetchedAt: now });
    expect(await cache.get("k1")).toBeNull();
    expect(await cache.get("k4")).not.toBeNull();
  });
});
