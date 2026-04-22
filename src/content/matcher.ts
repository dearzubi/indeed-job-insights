import type { Config } from "../shared/config.ts";
import { buildWholeWordRegex, normalizeCityName } from "../shared/normalize.ts";

export type CityHit = "home" | "home-mentioned" | "nearby" | "remote" | "none";

export interface KeywordHit {
  term: string;
  start: number;
  end: number;
}

export interface MatchResult {
  cityHit: CityHit;
  cityPillLabel: string | null;
  keywordHits: KeywordHit[];
  isZeroMatch: boolean;
  leftBorderColor: "green" | "blue" | "purple" | null;
}

const REMOTE_RE = /\b(fully remote|work from home|wfh|remote|hybrid)\b/i;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function classifyLocation(lowerText: string, structuredLocation: string, config: Config): CityHit {
  if (REMOTE_RE.test(lowerText)) return "remote";
  const normStructured = normalizeCityName(structuredLocation);
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

  const cityPillLabel = makeCityPillLabel(cityHit, fullText, config);
  const leftBorderColor = makeBorderColor(cityHit, keywordHits.length);
  const isZeroMatch = cityHit === "none" && keywordHits.length === 0;

  return { cityHit, cityPillLabel, keywordHits, isZeroMatch, leftBorderColor };
}

function makeCityPillLabel(cityHit: CityHit, fullText: string, config: Config): string | null {
  switch (cityHit) {
    case "home":
      return "📍 Home city match";
    case "remote":
      return "🏠 Remote";
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

function makeBorderColor(
  cityHit: CityHit,
  keywordHitCount: number,
): "green" | "blue" | "purple" | null {
  if (cityHit === "home") return "purple";
  if (cityHit === "remote") return "blue";
  if (cityHit === "home-mentioned" || cityHit === "nearby") return "green";
  if (cityHit === "none" && keywordHitCount > 0) return "green";
  return null;
}

function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
