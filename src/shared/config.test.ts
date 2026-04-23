import { beforeEach, describe, expect, it } from "vitest";
import { type MockStorage, makeMockStorage } from "../../test/helper.ts";
import { ConfigStore, DEFAULT_CONFIG, DEFAULT_CONFIG_STORAGE_KEY } from "./config.ts";

describe("ConfigStore", () => {
  let storage: MockStorage;
  beforeEach(() => {
    storage = makeMockStorage();
  });

  describe("save", () => {
    it("merges overlapping writes without losing fields", async () => {
      const store = new ConfigStore(storage);
      await store.save({ ...DEFAULT_CONFIG });
      await Promise.all([
        store.save({ dimZeroMatch: false }),
        store.save({ dimNegativeMatch: false }),
      ]);
      const cfg = await store.load();
      expect(cfg.dimZeroMatch).toBe(false);
      expect(cfg.dimNegativeMatch).toBe(false);
    });

    it("preserves unrelated fields on partial update", async () => {
      const store = new ConfigStore(storage);
      await store.save({ ...DEFAULT_CONFIG, myAddress: "Toronto", enabled: true });
      await store.save({ dimZeroMatch: false });
      const cfg = await store.load();
      expect(cfg.myAddress).toBe("Toronto");
      expect(cfg.enabled).toBe(true);
      expect(cfg.dimZeroMatch).toBe(false);
    });
  });

  describe("load", () => {
    it("returns DEFAULT_CONFIG when storage empty", async () => {
      const store = new ConfigStore(storage);
      expect(await store.load()).toEqual(DEFAULT_CONFIG);
    });

    it("fills missing fields from DEFAULT_CONFIG on partial stored value", async () => {
      storage.backing[DEFAULT_CONFIG_STORAGE_KEY] = { version: 1, myAddress: "Mississauga" };
      const store = new ConfigStore(storage);
      const cfg = await store.load();
      expect(cfg.myAddress).toBe("Mississauga");
      expect(cfg.enabled).toBe(DEFAULT_CONFIG.enabled);
      expect(cfg.keywords).toEqual([]);
    });

    it("honors a custom storageKey", async () => {
      storage.backing["custom-key"] = { version: 1, myAddress: "Ottawa" };
      const store = new ConfigStore(storage, { storageKey: "custom-key" });
      const cfg = await store.load();
      expect(cfg.myAddress).toBe("Ottawa");
    });
  });
});
