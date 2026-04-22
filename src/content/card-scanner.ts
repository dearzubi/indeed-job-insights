import type { Config } from "../shared/config.ts";
import { observeCard } from "./card-visitor.ts";
import { SELECTORS } from "./selectors.ts";

export function startScanning(config: Config): () => void {
  const container = document.querySelector<HTMLElement>(SELECTORS.resultsContainer);
  if (!container) {
    console.warn("[indeed-helper] results container not found");
    return () => {};
  }

  const registered = new WeakSet<HTMLElement>();

  const registerAll = (): void => {
    const candidates = Array.from(container.querySelectorAll<HTMLElement>(SELECTORS.jobCard));
    const outermost = outermostOnly(candidates);
    for (const card of outermost) {
      if (registered.has(card)) continue;
      registered.add(card);
      observeCard(card, config);
    }
  };

  registerAll();

  const mo = new MutationObserver(() => registerAll());
  mo.observe(container, { childList: true, subtree: true });

  return () => mo.disconnect();
}

/**
 * Given a list of candidate card elements, drop any that is a descendant of
 * another candidate in the same list. Solves the case where Indeed's DOM has
 * nested wrappers that both match our selector (e.g., `<li.eu4oa1w0>` around
 * `<div.job_seen_beacon>`), which otherwise causes duplicate decoration.
 */
export function outermostOnly(elements: HTMLElement[]): HTMLElement[] {
  return elements.filter((el) => !elements.some((other) => other !== el && other.contains(el)));
}
