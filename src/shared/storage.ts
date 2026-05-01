import type { StorageLike } from "./types.ts";

export const chromeLocalStorage: StorageLike = {
  get: (key) => chrome.storage.local.get(key),
  set: (obj) => chrome.storage.local.set(obj),
  remove: (key) => chrome.storage.local.remove(key),
} as const;
