import { loadConfig, saveConfig } from "../shared/config.ts";

const enabled = document.getElementById("enabled") as HTMLInputElement;
const dim = document.getElementById("dim") as HTMLInputElement;
const dimNeg = document.getElementById("dimNegative") as HTMLInputElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;

async function hydrate(): Promise<void> {
  const cfg = await loadConfig();
  enabled.checked = cfg.enabled;
  dim.checked = cfg.dimZeroMatch;
  dimNeg.checked = cfg.dimNegativeMatch;
}

enabled.addEventListener("change", async () => {
  await saveConfig({ enabled: enabled.checked });
  // Reload the active tab so the content script re-boots with the new setting.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id !== undefined) await chrome.tabs.reload(tab.id);
});

dim.addEventListener("change", async () => {
  await saveConfig({ dimZeroMatch: dim.checked });
});

dimNeg.addEventListener("change", async () => {
  await saveConfig({ dimNegativeMatch: dimNeg.checked });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

void hydrate();
