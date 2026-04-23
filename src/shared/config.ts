export interface Config {
  version: 1;
  homeCity: string;
  nearbyCities: string[];
  keywords: string[];
  excludedKeywords: string[];
  googleMapsApiKey: string;
  enabled: boolean;
  dimZeroMatch: boolean;
  dimNegativeMatch: boolean;
}

export const DEFAULT_CONFIG: Config = {
  version: 1,
  homeCity: "",
  nearbyCities: [],
  keywords: [],
  excludedKeywords: [],
  googleMapsApiKey: "",
  enabled: true,
  dimZeroMatch: true,
  dimNegativeMatch: true,
};

const STORAGE_KEY = "config";

export async function loadConfig(): Promise<Config> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as Partial<Config> | undefined;
  if (!raw || raw.version !== 1) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...raw };
}

// Serialize read-modify-write cycles so near-simultaneous partial writes
// (e.g. two popup toggles clicked within a tick) can't clobber each other.
let saveQueue: Promise<unknown> = Promise.resolve();

export function saveConfig(partial: Partial<Config>): Promise<void> {
  const next = saveQueue.then(async () => {
    const current = await loadConfig();
    const merged: Config = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
  });
  saveQueue = next.catch(() => undefined);
  return next;
}
