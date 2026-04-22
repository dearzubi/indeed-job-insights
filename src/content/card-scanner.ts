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
    for (const card of Array.from(container.querySelectorAll<HTMLElement>(SELECTORS.jobCard))) {
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
