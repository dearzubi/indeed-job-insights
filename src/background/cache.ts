import { chromeLocalStorage } from "../shared/storage.ts";
import { TtlCache } from "../shared/ttl-cache.ts";

interface DistanceCacheData {
  meters: number;
  minutes: number;
}

const DISTANCE_CACHE_STORAGE_KEY = "distanceCache";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days
const CACHE_MAX_ENTRIES = 500;

export const distanceCache = new TtlCache<DistanceCacheData>(chromeLocalStorage, {
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
  storageKey: DISTANCE_CACHE_STORAGE_KEY,
});
