import { unwrapHighlights, wrapTerms } from "./highlight.ts";
import { ensureStylesInjected } from "./injector.css.ts";
import type { MatchResult } from "./matcher.ts";
import { SELECTORS } from "./selectors.ts";

export interface InjectContext {
  distanceMinutes: number | null;
  distanceError: string | null;
  dimZeroMatch: boolean;
  dimNegativeMatch: boolean;
  excludedKeywords: string[];
  postedAge: string | null;
  postedToday: boolean;
  organicApplyStarts: number | null;
}

function formatPostedLabel(ctx: InjectContext): string | null {
  if (ctx.postedToday) return "🕒 Posted today";
  if (ctx.postedAge?.trim()) return `🕒 ${ctx.postedAge.trim()}`;
  return null;
}

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

  // Single footer appended at the end of the card so our decorations render
  // after Indeed's own content (title/company/CTA rows) rather than shoving
  // their layout down.
  const footer = document.createElement("div");
  footer.className = "ext-footer";

  const pillsRow = document.createElement("div");
  pillsRow.className = "ext-pills";

  // Work-mode pill - always present
  const workPill = document.createElement("span");
  workPill.className = `ext-pill ext-pill-${result.workMode}`;
  workPill.textContent = result.workModePillLabel;
  pillsRow.appendChild(workPill);

  // City-match pill - only when there's a match
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

  const postedLabel = formatPostedLabel(ctx);
  if (postedLabel) {
    const p = document.createElement("span");
    p.className = "ext-pill ext-pill-posted";
    p.textContent = postedLabel;
    pillsRow.appendChild(p);
  }

  if (typeof ctx.organicApplyStarts === "number" && ctx.organicApplyStarts > 0) {
    const p = document.createElement("span");
    p.className = "ext-pill ext-pill-interested";
    p.textContent = `💡 ${ctx.organicApplyStarts} interested`;
    pillsRow.appendChild(p);
  }

  footer.appendChild(pillsRow);

  // Distance badge: only render when we have data or an error to report. When
  // the user hasn't configured an address + API key (or the extension simply
  // couldn't pick a destination), omit the badge entirely.
  if (ctx.distanceError || ctx.distanceMinutes !== null) {
    const badge = document.createElement("span");
    if (ctx.distanceError) {
      badge.className = "ext-distance ext-distance-err";
      badge.textContent = "⚠";
      badge.title = ctx.distanceError;
    } else if (ctx.distanceMinutes !== null) {
      badge.className = ctx.distanceMinutes > 30 ? "ext-distance ext-distance-far" : "ext-distance";
      badge.textContent = `🚗 ${formatMinutes(ctx.distanceMinutes)}`;
    }
    pillsRow.appendChild(badge);
  }

  // Indeed's `.slider_container` is the element with the rounded blue border
  // around the listing. It has overflow:hidden + a fixed height, so we have to
  // (a) render the footer inside it and (b) let it grow - the grow part is
  // done via a CSS `:has()` rule in injector.css.ts.
  const footerHost =
    card.querySelector<HTMLElement>(".slider_container") ??
    card.closest<HTMLElement>(".slider_container") ??
    card;
  footerHost.appendChild(footer);
  nodes.push(footer);

  // Keyword highlights within the snippet
  const snippetEl = card.querySelector<HTMLElement>(SELECTORS.snippetText);
  if (snippetEl) {
    if (result.keywordHits.length > 0) {
      const uniqueTerms = [...new Set(result.keywordHits.map((h) => h.term.toLowerCase()))];
      wrapTerms(snippetEl, uniqueTerms, "ext-kw-hit");
    }
    if (result.excludedHitsCount > 0 && ctx.excludedKeywords.length > 0) {
      wrapTerms(snippetEl, ctx.excludedKeywords, "ext-kw-excluded");
    }
  }

  const dimForZero = result.isZeroMatch && ctx.dimZeroMatch;
  const dimForNegative =
    ctx.dimNegativeMatch && result.excludedHitsCount > result.keywordHits.length;
  card.classList.toggle("ext-dim", dimForZero || dimForNegative);

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
  for (const stray of Array.from(card.querySelectorAll(".ext-footer, .ext-pills, .ext-distance"))) {
    stray.remove();
  }
  card.classList.remove("ext-dim");
  unwrapHighlights(card);
}
