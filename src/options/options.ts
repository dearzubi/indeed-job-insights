import { DEFAULT_CONFIG, loadConfig, saveConfig } from "../shared/config.ts";
import { normalizeCityName, normalizeKeyword } from "../shared/normalize.ts";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const form = $<HTMLFormElement>("form");
const homeCity = $<HTMLInputElement>("homeCity");
const nearbyCities = $<HTMLTextAreaElement>("nearbyCities");
const keywords = $<HTMLTextAreaElement>("keywords");
const excludedKeywords = $<HTMLTextAreaElement>("excludedKeywords");
const apiKey = $<HTMLInputElement>("googleMapsApiKey");
const dim = $<HTMLInputElement>("dimZeroMatch");
const dimNeg = $<HTMLInputElement>("dimNegativeMatch");
const status = $<HTMLSpanElement>("status");
const clearCacheBtn = $<HTMLButtonElement>("clearCache");
const cacheStatus = $<HTMLSpanElement>("cacheStatus");

const CACHE_STORAGE_KEY = "distanceCache";

async function getCacheEntryCount(): Promise<number> {
  const got = await chrome.storage.local.get(CACHE_STORAGE_KEY);
  const raw = got[CACHE_STORAGE_KEY];
  return raw && typeof raw === "object" ? Object.keys(raw).length : 0;
}

async function refreshCacheStatus(): Promise<void> {
  const n = await getCacheEntryCount();
  cacheStatus.textContent = `${n} cached location${n === 1 ? "" : "s"}.`;
  cacheStatus.classList.remove("error");
}

async function hydrate(): Promise<void> {
  const cfg = await loadConfig();
  homeCity.value = cfg.homeCity;
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

  const home = homeCity.value.trim();
  const key = apiKey.value.trim();

  if (!home) {
    status.textContent = "Your address is required.";
    status.classList.add("error");
    return;
  }
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(key)) {
    status.textContent =
      "API key doesn't look like a Google Maps key (must start with AIza, 39 chars).";
    status.classList.add("error");
    return;
  }

  await saveConfig({
    ...DEFAULT_CONFIG,
    homeCity: home,
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
});

clearCacheBtn.addEventListener("click", async () => {
  await chrome.storage.local.remove(CACHE_STORAGE_KEY);
  cacheStatus.textContent = "Cache cleared.";
  cacheStatus.classList.remove("error");
});

void hydrate();
void refreshCacheStatus();
