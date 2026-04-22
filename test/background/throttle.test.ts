import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Throttle } from "../../src/background/throttle.ts";

describe("Throttle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("executes immediately when tokens available", async () => {
    const t = new Throttle(1, 1000);
    const fn = vi.fn().mockResolvedValue("x");
    const result = await t.run(fn);
    expect(result).toBe("x");
    expect(fn).toHaveBeenCalledOnce();
  });

  it("delays execution when tokens exhausted", async () => {
    const t = new Throttle(1, 1000);
    const fn = vi.fn().mockResolvedValue("y");
    const p1 = t.run(fn);
    const p2 = t.run(fn);
    await p1;
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    await p2;
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("honors pause window (backoff)", async () => {
    const t = new Throttle(10, 100);
    t.pauseFor(5000);
    const fn = vi.fn().mockResolvedValue("z");
    const p = t.run(fn);
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    await p;
    expect(fn).toHaveBeenCalledOnce();
  });
});
