import type { Config } from "../shared/config.ts";
import { unwrapHighlights, wrapTerms } from "./highlight.ts";

const DETAIL_PANE_SELECTOR = "#jobDescriptionText";
const HIGHLIGHTED_ATTR = "data-ext-highlighted";

/**
 * Starts highlighting configured keywords inside Indeed's right-hand detail
 * pane (#jobDescriptionText). Re-highlights when the user clicks a different
 * card and the pane's content changes.
 * Returns a teardown function.
 */
export function startDetailPaneHighlighter(config: Config): () => void {
  const positiveTerms = [...new Set(config.keywords.map((k) => k.toLowerCase()))];
  const excludedTerms = [...new Set(config.excludedKeywords.map((k) => k.toLowerCase()))];
  if (positiveTerms.length === 0 && excludedTerms.length === 0) return () => {};

  let current: HTMLElement | null = null;

  const applyTo = (host: HTMLElement): void => {
    // If the pane's content has changed, reset then re-wrap.
    if (host.getAttribute(HIGHLIGHTED_ATTR) === "1") {
      unwrapHighlights(host);
    }
    if (positiveTerms.length > 0) wrapTerms(host, positiveTerms, "ext-kw-hit");
    if (excludedTerms.length > 0) wrapTerms(host, excludedTerms, "ext-kw-excluded");
    host.setAttribute(HIGHLIGHTED_ATTR, "1");
  };

  const pickAndApply = (): void => {
    const host = document.querySelector<HTMLElement>(DETAIL_PANE_SELECTOR);
    if (!host) {
      current = null;
      return;
    }
    if (host !== current) {
      // New element, or first time seeing one.
      current = host;
      applyTo(host);
      return;
    }
    // Same element — only re-apply if it has lost its highlighted marker
    // (e.g., Indeed replaced the inner HTML). Avoids an infinite loop where
    // our own DOM mutations retrigger the observer.
    if (host.getAttribute(HIGHLIGHTED_ATTR) !== "1") {
      applyTo(host);
    }
  };

  pickAndApply();

  const mo = new MutationObserver(() => pickAndApply());
  mo.observe(document.body, { childList: true, subtree: true });

  return () => mo.disconnect();
}
