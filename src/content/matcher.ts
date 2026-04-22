import type { Config } from "../shared/config.ts";
import { normalizeCityName } from "../shared/normalize.ts";

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
  return {
    cityHit,
    cityPillLabel: null,
    keywordHits: [],
    isZeroMatch: cityHit === "none",
    leftBorderColor: null,
  };
}
