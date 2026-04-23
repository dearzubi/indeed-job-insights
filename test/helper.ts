import { vi } from "vitest";
import type { StorageLike } from "../src/shared/types.ts";

export interface MockStorage extends StorageLike {
  backing: Record<string, unknown>;
}

export function makeMockStorage(): MockStorage {
  const backing: Record<string, unknown> = {};
  return {
    backing,
    get: vi.fn((key: string) => Promise.resolve({ [key]: backing[key] })),
    set: vi.fn((obj: Record<string, unknown>) => {
      Object.assign(backing, obj);
      return Promise.resolve();
    }),
    remove: vi.fn((key: string) => {
      delete backing[key];
      return Promise.resolve();
    }),
  };
}
