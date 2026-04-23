/**
 * Trailing 2-letter uppercase state/province code preceded by a comma, e.g. `, ON` or `, CA`.
 * Lookahead prevents chopping the first two letters of a longer word.
 */
const PROVINCE_STATE_SUFFIX = /,\s*[A-Z]{2}(?=\b|,|$)/g;

/** Trailing country name/abbreviation, e.g. `, Canada`, `, USA`, `, United Kingdom`. Case-insensitive. */
const COUNTRY_SUFFIX = /,\s*(Canada|United States|USA|US|United Kingdom|UK|Australia|India)\b/gi;

/** Punctuation characters stripped from city names before comparison. */
const PUNCTUATION = /[.'`"!?()]/g;

/** Any run of whitespace, used to collapse to a single space. */
const WHITESPACE = /\s+/g;

/** Regex metacharacters that must be escaped when embedding user input into a regex. */
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/**
 * A regex that never matches (negative lookahead on empty string always fails).
 * Returned from {@link buildWholeWordRegex} for empty keyword lists so callers
 * can always treat the result as a usable `RegExp`.
 */
const NEVER_MATCHES = /(?!)/giu;

/**
 * Canonicalise a city string for equality comparison.
 *
 * Pipeline (order matters):
 * 1. Strip country suffix (e.g. `, Canada`) - done first so it doesn't
 *    interact with the 2-letter province/state regex.
 * 2. Strip province/state suffix (e.g. `, ON`).
 * 3. Strip the punctuation set ({@link PUNCTUATION}).
 * 4. Collapse whitespace runs to a single space.
 * 5. `trim()` and `toLowerCase()`.
 *
 * @param input Raw city string (may include country/state suffixes, punctuation, casing).
 * @returns Lowercased, trimmed city name suitable for set lookups. Empty string for falsy input.
 *
 * @example
 * normalizeCityName("Toronto, ON, Canada"); // "toronto"
 * normalizeCityName("  St. John's, NL  ");  // "st johns"
 */
export function normalizeCityName(input: string): string {
  if (!input) return "";
  let out = input;
  out = out.replace(COUNTRY_SUFFIX, "");
  out = out.replace(PROVINCE_STATE_SUFFIX, "");
  out = out.replace(PUNCTUATION, "");
  out = out.replace(WHITESPACE, " ");
  return out.trim().toLowerCase();
}

/**
 * Normalise a user-entered keyword for consistent comparison.
 *
 * Only trims surrounding whitespace and lowercases - no punctuation stripping,
 * because keywords like `c++` or `.net` rely on their symbols.
 *
 * @param input Raw keyword string from user input.
 * @returns Trimmed, lowercased keyword.
 */
export function normalizeKeyword(input: string): string {
  return input.trim().toLowerCase();
}

/**
 * Escape regex metacharacters in a string so it can be safely embedded in a `RegExp`.
 *
 * Uses `$&` to prefix each matched metacharacter with a backslash.
 *
 * @param s Arbitrary string, typically user input.
 * @returns String with `. * + ? ^ $ { } ( ) | [ ] \` escaped.
 *
 * @example
 * escapeRegex("c++ (v2)"); // "c\\+\\+ \\(v2\\)"
 */
export function escapeRegex(s: string): string {
  return s.replace(REGEX_SPECIAL, "\\$&");
}

/**
 * Whether a keyword both starts and ends with a Unicode word character
 * (letter, number, or underscore).
 *
 * Used by {@link buildWholeWordRegex} to decide whether `\b` boundaries
 * are safe or whether manual lookaround boundaries are needed.
 */
function hasWordBoundary(kw: string): boolean {
  return /^[\p{L}\p{N}_]/u.test(kw) && /[\p{L}\p{N}_]$/u.test(kw);
}

/**
 * Build a single combined regex that matches any of the given keywords as whole words/tokens.
 *
 * Behaviour:
 * - Empty list (or all entries empty after trimming) returns {@link NEVER_MATCHES}.
 * - Each keyword is trimmed, regex-escaped, and wrapped with boundary assertions:
 *   - Keywords that start AND end with a word character use standard `\b...\b`.
 *   - Keywords with punctuation/symbol edges (e.g. `c++`, `.net`) use manual
 *     Unicode-aware lookarounds `(?<![\p{L}\p{N}_])...(?![\p{L}\p{N}_])`,
 *     because `\b` misbehaves at non-word edges.
 * - Keywords are sorted by length descending before being joined with `|`, so
 *   alternation prefers the longest match (e.g. `JavaScript` wins over `Java`).
 * - Flags: `g` (global), `i` (case-insensitive), `u` (Unicode).
 *
 * @param keywords List of user-entered keywords. Empty/whitespace-only entries are ignored.
 * @returns A `RegExp` matching any keyword as a whole token, or a never-matching regex.
 *
 * @example
 * const re = buildWholeWordRegex(["Java", "JavaScript", "c++"]);
 * "I know JavaScript and c++".match(re); // ["JavaScript", "c++"]
 */
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
