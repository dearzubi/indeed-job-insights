import { configStore } from "../shared/config.ts";
import { $ } from "../shared/dom.ts";

const enabled = $<HTMLInputElement>("enabled");
const dim = $<HTMLInputElement>("dim");
const dimNeg = $<HTMLInputElement>("dimNegative");
const openOptions = $<HTMLAnchorElement>("openOptions");
const status = $<HTMLSpanElement>("status");

function setStatus(text: string, isError: boolean): void {
  status.textContent = text;
  status.classList.toggle("error", isError);
}

async function hydrate(): Promise<void> {
  const cfg = await configStore.load();
  enabled.checked = cfg.enabled;
  dim.checked = cfg.dimZeroMatch;
  dimNeg.checked = cfg.dimNegativeMatch;
}

enabled.addEventListener("change", async () => {
  setStatus("", false);
  try {
    await configStore.save({ enabled: enabled.checked });
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
    await configStore.save({ dimZeroMatch: dim.checked });
  } catch (e) {
    dim.checked = !dim.checked;
    setStatus(`Save failed: ${String(e)}`, true);
  }
});

dimNeg.addEventListener("change", async () => {
  setStatus("", false);
  try {
    await configStore.save({ dimNegativeMatch: dimNeg.checked });
  } catch (e) {
    dimNeg.checked = !dimNeg.checked;
    setStatus(`Save failed: ${String(e)}`, true);
  }
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});

void hydrate();
