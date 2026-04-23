import type {
  ComputeDistanceResponse,
  ContentToBackground,
  DistanceDestination,
} from "../shared/types.ts";
import { distanceCache } from "./cache.ts";
import { fetchDrivingDistance } from "./distance.ts";
import { Throttle } from "./throttle.ts";

// MV3 service workers hibernate after ~30s idle. Persist pauseUntil so a quota
// pause we set here isn't forgotten on next wake; token state doesn't matter
// (fresh capacity on wake is fine).
const THROTTLE_PAUSE_KEY = "throttlePauseUntil";
const throttle = new Throttle(1, 1000, (pauseUntil) => {
  void chrome.storage.local.set({ [THROTTLE_PAUSE_KEY]: pauseUntil });
});
void (async () => {
  const got = await chrome.storage.local.get(THROTTLE_PAUSE_KEY);
  const stored = got[THROTTLE_PAUSE_KEY];
  if (typeof stored !== "number") return;
  const remaining = stored - Date.now();
  if (remaining > 0) throttle.pauseFor(remaining);
})();

function normalizeKeyPart(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function destKey(to: DistanceDestination): string {
  if ("address" in to) return normalizeKeyPart(to.address);
  // Round to ~11m so cards at near-identical coordinates share a cache entry.
  return `@${to.lat.toFixed(4)},${to.lng.toFixed(4)}`;
}

function cacheKey(from: string, to: DistanceDestination): string {
  return `${normalizeKeyPart(from)}→${destKey(to)}`;
}

async function handleComputeDistance(msg: ContentToBackground): Promise<ComputeDistanceResponse> {
  if (msg.type !== "computeDistance") {
    return { ok: false, errorKind: "unknown", message: "unknown message type" };
  }
  const key = cacheKey(msg.from, msg.to);
  const hit = await distanceCache.get(key);
  if (hit) {
    return { ok: true, minutes: hit.minutes, meters: hit.meters, cached: true };
  }
  const result = await throttle.run(() =>
    fetchDrivingDistance({ from: msg.from, to: msg.to, apiKey: msg.apiKey }),
  );
  if (result.ok) {
    await distanceCache.set(key, {
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
    handleComputeDistance(msg).then(sendResponse, (e: unknown) => {
      sendResponse({ ok: false, errorKind: "unknown", message: String(e) });
    });
    return true;
  }
  return false;
});
