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
  pausedTabs: Record<number, true>;
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
  pausedTabs: {},
};

const STORAGE_KEY = "config";

export async function loadConfig(): Promise<Config> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const raw = result[STORAGE_KEY] as Partial<Config> | undefined;
  if (!raw || raw.version !== 1) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...raw };
}

export async function saveConfig(partial: Partial<Config>): Promise<void> {
  const current = await loadConfig();
  const next: Config = { ...current, ...partial };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
}

export function isConfigComplete(config: Config): boolean {
  return config.homeCity.trim().length > 0 && config.googleMapsApiKey.trim().length > 0;
}
