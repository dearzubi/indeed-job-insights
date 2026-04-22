import { loadConfig } from "../shared/config.ts";
import { startScanning } from "./card-scanner.ts";
import { startDetailPaneHighlighter } from "./detail-pane.ts";
import { SELECTORS } from "./selectors.ts";

async function boot(): Promise<void> {
  const config = await loadConfig();
  if (!config.enabled) return;
  waitForResults(() => startScanning(config));
  startDetailPaneHighlighter(config);
}

function waitForResults(callback: () => void): void {
  const tryStart = (): boolean => {
    if (document.querySelector(SELECTORS.resultsContainer)) {
      callback();
      return true;
    }
    return false;
  };
  if (tryStart()) return;
  const mo = new MutationObserver(() => {
    if (tryStart()) mo.disconnect();
  });
  mo.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => mo.disconnect(), 15000);
}

try {
  void boot();
} catch (e) {
  console.error("[indeed-job-insights] boot failed", e);
}
