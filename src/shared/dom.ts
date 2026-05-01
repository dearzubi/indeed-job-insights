export function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

// Balanced-bracket scan starting at the first `open` bracket after `afterIdx`,
// capped to prevent runaway on malformed HTML. Tracks JSON string state so
// brackets inside `"..."` string literals don't corrupt the depth counter.
// Returns the matched substring or null.
export function extractBalanced(
  html: string,
  afterIdx: number,
  open: "{" | "[",
  close: "}" | "]",
  maxLen: number,
): string | null {
  const start = html.indexOf(open, afterIdx);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length && i < start + maxLen; i++) {
    const c = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJsonObject(html: string, afterIdx: number, maxLen = 16_000): string | null {
  return extractBalanced(html, afterIdx, "{", "}", maxLen);
}

export function extractJsonArray(html: string, afterIdx: number, maxLen = 200_000): string | null {
  return extractBalanced(html, afterIdx, "[", "]", maxLen);
}
