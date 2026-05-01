import { chromeLocalStorage } from "../../shared/storage.ts";
import { TtlCache } from "../../shared/ttl-cache.ts";
import type { JobDescriptionData } from "./types.ts";

const JOB_DESCRIPTION_CACHE_STORAGE_KEY = "jobDescriptionCache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours
const CACHE_MAX_ENTRIES = 500;

export const jobDescriptionCache = new TtlCache<JobDescriptionData>(chromeLocalStorage, {
  ttlMs: CACHE_TTL_MS,
  maxEntries: CACHE_MAX_ENTRIES,
  storageKey: JOB_DESCRIPTION_CACHE_STORAGE_KEY,
});
