import type { ComputeDistanceResponse, ContentToBackground } from "../shared/messages.ts";
import { normalizeCityName } from "../shared/normalize.ts";
import { DistanceCache } from "./cache.ts";
import { fetchDrivingDistance } from "./distance.ts";
import { Throttle } from "./throttle.ts";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
const cache = new DistanceCache(
  {
    get: (key) => chrome.storage.local.get(key),
    set: (obj) => chrome.storage.local.set(obj),
  },
  { ttlMs: CACHE_TTL_MS, maxEntries: CACHE_MAX_ENTRIES },
);
const throttle = new Throttle(1, 1000);

function cacheKey(from: string, to: string): string {
  return `${normalizeCityName(from)}→${normalizeCityName(to)}`;
}

async function handleComputeDistance(msg: ContentToBackground): Promise<ComputeDistanceResponse> {
  if (msg.type !== "computeDistance") {
    return { ok: false, errorKind: "unknown", message: "unknown message type" };
  }
  const key = cacheKey(msg.from, msg.to);
  const hit = await cache.get(key);
  if (hit) {
    return { ok: true, minutes: hit.minutes, meters: hit.meters, cached: true };
  }
  const result = await throttle.run(() =>
    fetchDrivingDistance({ from: msg.from, to: msg.to, apiKey: msg.apiKey }),
  );
  if (result.ok) {
    await cache.set(key, {
      meters: result.meters,
      minutes: result.minutes,
      fetchedAt: Date.now(),
    });
    return { ...result, cached: false };
  }
  if (result.errorKind === "quota-exceeded" || result.errorKind === "rate-limited") {
    throttle.pauseFor(60_000);
  }
  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const msg = message as ContentToBackground;
  if (msg.type === "computeDistance") {
    handleComputeDistance(msg).then(sendResponse);
    return true;
  }
  return false;
});
