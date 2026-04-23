import type { StorageLike } from "./types.ts";

export interface Config {
  version: 1;
  myAddress: string;
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
  myAddress: "",
  nearbyCities: [],
  keywords: [],
  excludedKeywords: [],
  googleMapsApiKey: "",
  enabled: true,
  dimZeroMatch: true,
  dimNegativeMatch: true,
};

export const DEFAULT_CONFIG_STORAGE_KEY = "config";

export class ConfigStore {
  readonly #storage: StorageLike;
  readonly #storageKey: string;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(storage: StorageLike, opts?: { storageKey?: string }) {
    this.#storage = storage;
    this.#storageKey = opts?.storageKey ?? DEFAULT_CONFIG_STORAGE_KEY;
  }

  async load(): Promise<Config> {
    const result = await this.#storage.get(this.#storageKey);
    const raw = result[this.#storageKey] as Partial<Config> | undefined;
    if (!raw || raw.version !== 1) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...raw };
  }

  save(partial: Partial<Config>): Promise<void> {
    const next = this.#queue.then(async () => {
      const current = await this.load();
      const merged: Config = { ...current, ...partial };
      await this.#storage.set({ [this.#storageKey]: merged });
    });
    this.#queue = next.catch(() => undefined);
    return next;
  }
}

export const configStore = new ConfigStore({
  get: (key) => chrome.storage.local.get(key),
  set: (obj) => chrome.storage.local.set(obj),
  remove: (key) => chrome.storage.local.remove(key),
});
