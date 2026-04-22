const PROVINCE_STATE_SUFFIX = /,\s*[A-Z]{2}(?=\b|,|$)/g;
const COUNTRY_SUFFIX = /,\s*(Canada|United States|USA|US|United Kingdom|UK|Australia|India)\b/gi;
const PUNCTUATION = /[.'`"!?()]/g;
const WHITESPACE = /\s+/g;

export function normalizeCityName(input: string): string {
  if (!input) return "";
  let out = input;
  out = out.replace(COUNTRY_SUFFIX, "");
  out = out.replace(PROVINCE_STATE_SUFFIX, "");
  out = out.replace(PUNCTUATION, "");
  out = out.replace(WHITESPACE, " ");
  return out.trim().toLowerCase();
}

export function normalizeKeyword(input: string): string {
  return input.trim().toLowerCase();
}

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(s: string): string {
  return s.replace(REGEX_SPECIAL, "\\$&");
}

function hasWordBoundary(kw: string): boolean {
  return /^[\p{L}\p{N}_]/u.test(kw) && /[\p{L}\p{N}_]$/u.test(kw);
}

const NEVER_MATCHES = /(?!)/giu;

export function buildWholeWordRegex(keywords: string[]): RegExp {
  if (keywords.length === 0) return NEVER_MATCHES;
  const parts = keywords
    .map((raw) => {
      const kw = raw.trim();
      if (!kw) return null;
      const escaped = escapeRegex(kw);
      const compiled = hasWordBoundary(kw)
        ? `\\b${escaped}\\b`
        : `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`;
      return { rawLen: kw.length, compiled };
    })
    .filter((p): p is { rawLen: number; compiled: string } => p !== null)
    .sort((a, b) => b.rawLen - a.rawLen)
    .map((p) => p.compiled);
  if (parts.length === 0) return NEVER_MATCHES;
  return new RegExp(parts.join("|"), "giu");
}
