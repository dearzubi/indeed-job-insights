import { loadConfig, saveConfig } from "../shared/config.ts";

const dim = document.getElementById("dim") as HTMLInputElement;
const dimNeg = document.getElementById("dimNegative") as HTMLInputElement;
const openOptions = document.getElementById("openOptions") as HTMLAnchorElement;

async function hydrate(): Promise<void> {
  const cfg = await loadConfig();
  dim.checked = cfg.dimZeroMatch;
  dimNeg.checked = cfg.dimNegativeMatch;
}

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
