import { type DistanceCache, distanceCache } from "../background/cache.ts";
import { configStore } from "../shared/config.ts";
import { $ } from "../shared/dom.ts";
import { normalizeCityName, normalizeKeyword } from "../shared/normalize.ts";

const form = $<HTMLFormElement>("form");
const myAddress = $<HTMLInputElement>("myAddress");
const nearbyCities = $<HTMLTextAreaElement>("nearbyCities");
const keywords = $<HTMLTextAreaElement>("keywords");
const excludedKeywords = $<HTMLTextAreaElement>("excludedKeywords");
const apiKey = $<HTMLInputElement>("googleMapsApiKey");
const dim = $<HTMLInputElement>("dimZeroMatch");
const dimNeg = $<HTMLInputElement>("dimNegativeMatch");
const status = $<HTMLSpanElement>("status");
const clearCacheBtn = $<HTMLButtonElement>("clearCache");
const cacheStatus = $<HTMLSpanElement>("cacheStatus");

async function refreshCacheStatus(cache: DistanceCache): Promise<void> {
  const n = await cache.count;
  cacheStatus.textContent = `${n} cached location${n === 1 ? "" : "s"}.`;
  cacheStatus.classList.remove("error");
}

async function hydrate(): Promise<void> {
  const cfg = await configStore.load();
  myAddress.value = cfg.myAddress;
  nearbyCities.value = cfg.nearbyCities.join("\n");
  keywords.value = cfg.keywords.join("\n");
  excludedKeywords.value = cfg.excludedKeywords.join("\n");
  apiKey.value = cfg.googleMapsApiKey;
  dim.checked = cfg.dimZeroMatch;
  dimNeg.checked = cfg.dimNegativeMatch;
}

function parseList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  status.textContent = "";
  status.classList.remove("error");

  const address = myAddress.value.trim();
  const key = apiKey.value.trim();

  try {
    await configStore.save({
      myAddress: address,
      nearbyCities: parseList(nearbyCities.value)
        .map((c) => normalizeCityName(c))
        .filter(Boolean),
      keywords: parseList(keywords.value)
        .map((k) => normalizeKeyword(k))
        .filter(Boolean),
      excludedKeywords: parseList(excludedKeywords.value)
        .map((k) => normalizeKeyword(k))
        .filter(Boolean),
      googleMapsApiKey: key,
      dimZeroMatch: dim.checked,
      dimNegativeMatch: dimNeg.checked,
    });
    status.textContent = "Saved.";
  } catch (err) {
    status.textContent = `Save failed: ${String(err)}`;
    status.classList.add("error");
  }
});

clearCacheBtn.addEventListener("click", async () => {
  try {
    await distanceCache.clear();
    cacheStatus.textContent = "Cache cleared.";
    cacheStatus.classList.remove("error");
  } catch (err) {
    cacheStatus.textContent = `Clear failed: ${String(err)}`;
    cacheStatus.classList.add("error");
  }
});

void hydrate();
void refreshCacheStatus(distanceCache);
