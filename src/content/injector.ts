import { unwrapHighlights, wrapTerms } from "./highlight.ts";
import { ensureStylesInjected } from "./injector.css.ts";
import type { MatchResult } from "./matcher.ts";
import { SELECTORS } from "./selectors.ts";

export interface InjectContext {
  distanceMinutes: number | null;
  distanceError: string | null;
  dimZeroMatch: boolean;
}

const BORDER_CLASSES = ["ext-border-green", "ext-border-blue", "ext-border-purple"] as const;

const injected = new WeakMap<HTMLElement, HTMLElement[]>();

function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function inject(card: HTMLElement, result: MatchResult, ctx: InjectContext): void {
  ensureStylesInjected();
  remove(card);

  const nodes: HTMLElement[] = [];

  const titleHost = card.querySelector<HTMLElement>(".jobTitle") ?? card;
  const pillsRow = document.createElement("div");
  pillsRow.className = "ext-pills";

  // Work-mode pill — always present
  const workPill = document.createElement("span");
  workPill.className = `ext-pill ext-pill-${result.workMode}`;
  workPill.textContent = result.workModePillLabel;
  pillsRow.appendChild(workPill);

  // City-match pill — only when there's a match
  if (result.cityPillLabel) {
    const cityPill = document.createElement("span");
    cityPill.className = "ext-pill ext-pill-city";
    cityPill.textContent = result.cityPillLabel;
    pillsRow.appendChild(cityPill);
  }

  // Keyword count pill
  if (result.keywordHits.length > 0) {
    const kwPill = document.createElement("span");
    kwPill.className = "ext-pill ext-pill-keywords";
    const count = result.keywordHits.length;
    kwPill.textContent = `● ${count} keyword hit${count === 1 ? "" : "s"}`;
    pillsRow.appendChild(kwPill);
  }

  if (result.excludedHitsCount > 0) {
    const excPill = document.createElement("span");
    excPill.className = "ext-pill ext-pill-excluded";
    const n = result.excludedHitsCount;
    excPill.textContent = `⊘ ${n} excluded hit${n === 1 ? "" : "s"}`;
    pillsRow.appendChild(excPill);
  }

  titleHost.parentElement?.insertBefore(pillsRow, titleHost);
  nodes.push(pillsRow);

  // Distance badge on location line
  const locEl = card.querySelector<HTMLElement>(SELECTORS.locationText);
  if (locEl) {
    const badge = document.createElement("span");
    if (ctx.distanceError) {
      badge.className = "ext-distance ext-distance-err";
      badge.textContent = "⚠";
      badge.title = ctx.distanceError;
    } else if (ctx.distanceMinutes !== null) {
      badge.className = ctx.distanceMinutes > 30 ? "ext-distance ext-distance-far" : "ext-distance";
      badge.textContent = `🚗 ${formatMinutes(ctx.distanceMinutes)}`;
    } else {
      badge.className = "ext-distance";
      badge.textContent = "—";
    }
    locEl.appendChild(badge);
    nodes.push(badge);
  }

  // Keyword highlights within the snippet
  const snippetEl = card.querySelector<HTMLElement>(SELECTORS.snippetText);
  if (snippetEl && result.keywordHits.length > 0) {
    const uniqueTerms = [...new Set(result.keywordHits.map((h) => h.term.toLowerCase()))];
    wrapTerms(snippetEl, uniqueTerms);
  }

  // Left-border color
  for (const cls of BORDER_CLASSES) {
    card.classList.remove(cls);
  }
  if (result.leftBorderColor) {
    card.classList.add(`ext-border-${result.leftBorderColor}`);
  }

  // Dim
  card.classList.toggle("ext-dim", result.isZeroMatch && ctx.dimZeroMatch);

  injected.set(card, nodes);
}

export function remove(card: HTMLElement): void {
  const nodes = injected.get(card);
  if (nodes) {
    for (const n of nodes) n.remove();
    injected.delete(card);
  }
  // Safety net: clear any stray decorations not tracked by the WeakMap
  // (e.g., after a DOM swap that changed the card's element identity).
  for (const stray of Array.from(card.querySelectorAll(".ext-pills, .ext-distance"))) {
    stray.remove();
  }
  for (const cls of ["ext-border-green", "ext-border-blue", "ext-border-purple", "ext-dim"]) {
    card.classList.remove(cls);
  }
  unwrapHighlights(card);
}
