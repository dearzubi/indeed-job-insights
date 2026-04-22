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
