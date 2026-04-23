import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Throttle } from "./throttle.ts";

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

  it("invokes onPauseChange when pauseUntil advances", () => {
    const onPauseChange = vi.fn();
    const t = new Throttle(1, 1000, onPauseChange);
    t.pauseFor(5000);
    expect(onPauseChange).toHaveBeenCalledTimes(1);
    const firstArg = onPauseChange.mock.calls[0]?.[0];
    expect(typeof firstArg).toBe("number");
    expect(firstArg).toBeGreaterThan(Date.now());
  });

  it("does not invoke onPauseChange when a shorter pause is requested", () => {
    const onPauseChange = vi.fn();
    const t = new Throttle(1, 1000, onPauseChange);
    t.pauseFor(10_000);
    t.pauseFor(1000);
    expect(onPauseChange).toHaveBeenCalledTimes(1);
  });
});
