import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG, loadConfig, saveConfig } from "./config.ts";

const STORAGE_KEY = "config";

function installChromeStorageMock(): Record<string, unknown> {
  const store: Record<string, unknown> = {};
  const chromeShim = {
    storage: {
      local: {
        get: vi.fn(async (key: string) => {
          await Promise.resolve();
          return { [key]: store[key] };
        }),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          await Promise.resolve();
          Object.assign(store, obj);
        }),
      },
    },
  };
  (globalThis as unknown as { chrome: typeof chromeShim }).chrome = chromeShim;
  return store;
}

describe("saveConfig", () => {
  beforeEach(() => {
    installChromeStorageMock();
  });

  it("merges overlapping writes without losing fields", async () => {
    await saveConfig({ ...DEFAULT_CONFIG });
    await Promise.all([
      saveConfig({ dimZeroMatch: false }),
      saveConfig({ dimNegativeMatch: false }),
    ]);
    const cfg = await loadConfig();
    expect(cfg.dimZeroMatch).toBe(false);
    expect(cfg.dimNegativeMatch).toBe(false);
  });

  it("preserves unrelated fields on partial update", async () => {
    await saveConfig({ ...DEFAULT_CONFIG, homeCity: "Toronto", enabled: true });
    await saveConfig({ dimZeroMatch: false });
    const cfg = await loadConfig();
    expect(cfg.homeCity).toBe("Toronto");
    expect(cfg.enabled).toBe(true);
    expect(cfg.dimZeroMatch).toBe(false);
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    installChromeStorageMock();
  });

  it("returns DEFAULT_CONFIG when storage empty", async () => {
    const cfg = await loadConfig();
    expect(cfg).toEqual(DEFAULT_CONFIG);
  });

  it("fills missing fields from DEFAULT_CONFIG on partial stored value", async () => {
    const store = installChromeStorageMock();
    store[STORAGE_KEY] = { version: 1, homeCity: "Mississauga" };
    const cfg = await loadConfig();
    expect(cfg.homeCity).toBe("Mississauga");
    expect(cfg.enabled).toBe(DEFAULT_CONFIG.enabled);
    expect(cfg.keywords).toEqual([]);
  });
});
