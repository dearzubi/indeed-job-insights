import type { Config } from "../shared/config.ts";
import { sanitizeLocation } from "../shared/location.ts";
import { buildWholeWordRegex, escapeRegex, normalizeCityName } from "../shared/normalize.ts";

export type CityHit = "home" | "home-mentioned" | "nearby" | "none";
export type WorkMode = "remote" | "hybrid" | "onsite";

export interface KeywordHit {
  term: string;
  start: number;
  end: number;
}

export interface MatchResult {
  cityHit: CityHit;
  workMode: WorkMode;
  cityPillLabel: string | null;
  workModePillLabel: string;
  keywordHits: KeywordHit[];
  excludedHitsCount: number;
  isZeroMatch: boolean;
}

function classifyLocation(lowerText: string, structuredLocation: string, config: Config): CityHit {
  const cleanedStructured = sanitizeLocation(structuredLocation);
  const normStructured = normalizeCityName(cleanedStructured);
  const normHome = normalizeCityName(config.homeCity);
  if (normHome && normStructured === normHome) return "home";
  if (normHome && new RegExp(`\\b${escapeRegex(normHome)}\\b`, "i").test(lowerText)) {
    return "home-mentioned";
  }
  for (const nearby of config.nearbyCities) {
    const norm = normalizeCityName(nearby);
    if (!norm) continue;
    if (new RegExp(`\\b${escapeRegex(norm)}\\b`, "i").test(lowerText)) return "nearby";
  }
  return "none";
}

function detectWorkMode(structuredLocation: string): WorkMode {
  const trimmed = structuredLocation.trim();
  if (/^hybrid\b/i.test(trimmed)) return "hybrid";
  if (/^remote\b/i.test(trimmed)) return "remote";
  return "onsite";
}

export function match(fullText: string, structuredLocation: string, config: Config): MatchResult {
  const lower = fullText.toLowerCase();
  const cityHit = classifyLocation(lower, structuredLocation, config);

  const keywordHits: KeywordHit[] = [];
  if (config.keywords.length > 0) {
    const re = buildWholeWordRegex(config.keywords);
    for (const m of fullText.matchAll(re)) {
      if (m.index === undefined) continue;
      keywordHits.push({
        term: m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  let excludedHitsCount = 0;
  if (config.excludedKeywords.length > 0) {
    const re = buildWholeWordRegex(config.excludedKeywords);
    for (const _m of fullText.matchAll(re)) excludedHitsCount++;
  }

  const workMode = detectWorkMode(structuredLocation);
  const cityPillLabel = makeCityPillLabel(cityHit, fullText, config);
  const workModePillLabel = makeWorkModePillLabel(workMode);
  // When the user has configured keywords, they are the primary relevance signal:
  // any card with zero keyword hits is zero-match regardless of city/workMode. When
  // no keywords are configured, fall back to location-based dimming so "survey a city"
  // mode still shows most cards.
  const isZeroMatch =
    config.keywords.length > 0
      ? keywordHits.length === 0
      : cityHit === "none" && workMode !== "remote";

  return {
    cityHit,
    workMode,
    cityPillLabel,
    workModePillLabel,
    keywordHits,
    excludedHitsCount,
    isZeroMatch,
  };
}

function makeCityPillLabel(cityHit: CityHit, fullText: string, config: Config): string | null {
  switch (cityHit) {
    case "home":
      return "📍 Home city match";
    case "home-mentioned":
      return `📍 ${config.homeCity.split(",")[0]?.trim() ?? ""} mentioned`;
    case "nearby": {
      const lower = fullText.toLowerCase();
      const hit = config.nearbyCities.find((c) => {
        const norm = normalizeCityName(c);
        return norm && new RegExp(`\\b${escapeRegex(norm)}\\b`, "i").test(lower);
      });
      return hit ? `📍 ${capitalize(hit)} mentioned` : "📍 Nearby city mentioned";
    }
    case "none":
      return null;
  }
}

function makeWorkModePillLabel(mode: WorkMode): string {
  switch (mode) {
    case "remote":
      return "🏠 Remote";
    case "hybrid":
      return "🏢 Hybrid";
    case "onsite":
      return "🏙️ Onsite";
  }
}

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
