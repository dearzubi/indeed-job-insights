import { isConfigComplete, loadConfig } from "../shared/config.ts";
import { startScanning } from "./card-scanner.ts";

async function boot(): Promise<void> {
  const config = await loadConfig();
  if (!isConfigComplete(config)) {
    renderSetupBanner();
    return;
  }
  waitForResults(() => startScanning(config));
}

function renderSetupBanner(): void {
  if (document.getElementById("indeed-helper-banner")) return;
  const bar = document.createElement("div");
  bar.id = "indeed-helper-banner";
  bar.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;background:#fff7e6;border-bottom:2px solid #d97706;color:#78350f;font-family:sans-serif;padding:10px 16px;text-align:center;font-size:13px;";
  bar.textContent = "Indeed Helper: finish setup in extension options. ";
  const link = document.createElement("a");
  link.id = "indeed-helper-open-options";
  link.href = "#";
  link.style.cssText = "color:#78350f;text-decoration:underline;";
  link.textContent = "Open options →";
  link.addEventListener("click", (e) => {
    e.preventDefault();
    void chrome.runtime.openOptionsPage();
  });
  bar.appendChild(link);
  document.body.appendChild(bar);
}

function waitForResults(callback: () => void): void {
  const tryStart = (): boolean => {
    if (document.querySelector("#mosaic-provider-jobcards, .jobsearch-ResultsList")) {
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
  console.error("[indeed-helper] boot failed", e);
}
