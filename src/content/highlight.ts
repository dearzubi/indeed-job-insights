const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

function escapeRegex(s: string): string {
  return s.replace(REGEX_SPECIAL, "\\$&");
}

/**
 * Wrap every whole-word case-insensitive occurrence of `terms` inside `host`'s
 * text nodes with a <span class="ext-kw-hit"> element. Idempotent in practice
 * if the caller invokes `unwrapHighlights(host)` first.
 */
export function wrapTerms(host: HTMLElement, terms: string[]): void {
  const cleaned = terms.map((t) => t.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  const pattern = new RegExp(`(${cleaned.map(escapeRegex).join("|")})`, "gi");
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const t = walker.currentNode as Text;
    // Skip text nodes that are already inside an ext-kw-hit span
    if ((t.parentElement as HTMLElement | null)?.classList.contains("ext-kw-hit")) continue;
    textNodes.push(t);
  }
  for (const node of textNodes) {
    const raw = node.textContent ?? "";
    pattern.lastIndex = 0;
    if (!pattern.test(raw)) continue;
    pattern.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIdx = 0;
    for (const m of raw.matchAll(pattern)) {
      if (m.index === undefined) continue;
      if (m.index > lastIdx) {
        frag.appendChild(document.createTextNode(raw.slice(lastIdx, m.index)));
      }
      const span = document.createElement("span");
      span.className = "ext-kw-hit";
      span.textContent = m[0];
      frag.appendChild(span);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < raw.length) {
      frag.appendChild(document.createTextNode(raw.slice(lastIdx)));
    }
    node.parentNode?.replaceChild(frag, node);
  }
}

/**
 * Undo wrapTerms: replace every `.ext-kw-hit` span under `host` with its text content.
 */
export function unwrapHighlights(host: HTMLElement): void {
  for (const hit of Array.from(host.querySelectorAll(".ext-kw-hit"))) {
    const parent = hit.parentNode;
    if (!parent) continue;
    while (hit.firstChild) parent.insertBefore(hit.firstChild, hit);
    hit.remove();
    parent.normalize();
  }
}
