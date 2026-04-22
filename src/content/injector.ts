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

export function inject(card: HTMLElement, result: MatchResult, ctx: InjectContext): void {
  ensureStylesInjected();
  remove(card);

  const nodes: HTMLElement[] = [];

  // Pill row above the title
  const titleHost = card.querySelector<HTMLElement>(".jobTitle") ?? card;
  const pillsRow = document.createElement("div");
  pillsRow.className = "ext-pills";
  if (result.cityPillLabel) {
    const pill = document.createElement("span");
    pill.className =
      result.cityHit === "remote" ? "ext-pill ext-pill-remote" : "ext-pill ext-pill-city";
    pill.textContent = result.cityPillLabel;
    pillsRow.appendChild(pill);
  }
  if (result.keywordHits.length > 0) {
    const kwPill = document.createElement("span");
    kwPill.className = "ext-pill ext-pill-keywords";
    const count = result.keywordHits.length;
    kwPill.textContent = `● ${count} keyword hit${count === 1 ? "" : "s"}`;
    pillsRow.appendChild(kwPill);
  }
  if (pillsRow.children.length > 0) {
    titleHost.parentElement?.insertBefore(pillsRow, titleHost);
    nodes.push(pillsRow);
  }

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
      badge.textContent = `🚗 ${ctx.distanceMinutes} min`;
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
