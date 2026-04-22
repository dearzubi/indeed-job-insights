const PREFIXES: RegExp[] = [
  /^\s*hybrid\s+work\s+in\s+/i,
  /^\s*hybrid\s+remote\s+in\s+/i,
  /^\s*remote\s+in\s+/i,
  /^\s*in[-\s]office\s+in\s+/i,
  /^\s*work\s+from\s+home\s+in\s+/i,
  /^\s*remote\s*[•·-]\s*/i,
  /^\s*hybrid\s*[•·-]\s*/i,
];

/**
 * Clean up a location string taken from an Indeed card so the Routes API can
 * geocode it. Strips work-mode prefixes like "Hybrid work in", "Remote in".
 * Returns empty string when the location is purely "Remote" (no associated
 * place) — callers should skip the distance call in that case.
 */
export function sanitizeLocation(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^\s*(remote|fully\s+remote|work\s+from\s+home|wfh)\s*$/i.test(trimmed)) return "";
  let out = trimmed;
  for (const p of PREFIXES) out = out.replace(p, "");
  return out.trim();
}
