import { loadConfig, saveConfig } from "../shared/config.ts";

const enabled = document.getElementById("enabled") as HTMLInputElement;
const dim = document.getElementById("dim") as HTMLInputElement;
const dimNeg = document.getElementById("dimNegative") as HTMLInputElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;
const status = document.getElementById("status") as HTMLSpanElement;

function setStatus(text: string, isError: boolean): void {
  status.textContent = text;
  status.classList.toggle("error", isError);
}

async function hydrate(): Promise<void> {
  const cfg = await loadConfig();
  enabled.checked = cfg.enabled;
  dim.checked = cfg.dimZeroMatch;
  dimNeg.checked = cfg.dimNegativeMatch;
}

enabled.addEventListener("change", async () => {
  setStatus("", false);
  try {
    await saveConfig({ enabled: enabled.checked });
    // Reload the active tab so the content script re-boots with the new setting.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id !== undefined) await chrome.tabs.reload(tab.id);
  } catch (e) {
    enabled.checked = !enabled.checked;
    setStatus(`Save failed: ${String(e)}`, true);
  }
});

dim.addEventListener("change", async () => {
  setStatus("", false);
  try {
    await saveConfig({ dimZeroMatch: dim.checked });
  } catch (e) {
    dim.checked = !dim.checked;
    setStatus(`Save failed: ${String(e)}`, true);
  }
});

dimNeg.addEventListener("change", async () => {
  setStatus("", false);
  try {
    await saveConfig({ dimNegativeMatch: dimNeg.checked });
  } catch (e) {
    dimNeg.checked = !dimNeg.checked;
    setStatus(`Save failed: ${String(e)}`, true);
  }
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

void hydrate();
