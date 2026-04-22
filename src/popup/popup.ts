import { loadConfig, saveConfig } from "../shared/config.ts";

const dim = document.getElementById("dim") as HTMLInputElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;

async function hydrate(): Promise<void> {
  const cfg = await loadConfig();
  dim.checked = cfg.dimZeroMatch;
}

dim.addEventListener("change", async () => {
  await saveConfig({ dimZeroMatch: dim.checked });
});

openOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

void hydrate();
