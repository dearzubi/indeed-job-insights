import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { fetchWithRetry, parseRetryAfterMs } from "./fetch-with-retry.ts";

function okResponse(body = "ok"): Response {
  return new Response(body, { status: 200 });
}

function errorResponse(status: number, headers?: Record<string, string>): Response {
  return new Response("err", headers ? { status, headers } : { status });
}

describe("fetchWithRetry", () => {
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns immediately on 2xx without retrying", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("yay"));
    const r = await fetchWithRetry("https://x.example/");
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns immediately on non-retryable 4xx", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(404));
    const r = await fetchWithRetry("https://x.example/");
    expect(r.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and succeeds", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(503));
    fetchMock.mockResolvedValueOnce(okResponse());
    const p = fetchWithRetry("https://x.example/", undefined, { baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 and succeeds", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429));
    fetchMock.mockResolvedValueOnce(okResponse());
    const p = fetchWithRetry("https://x.example/", undefined, { baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on network error and succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    fetchMock.mockResolvedValueOnce(okResponse());
    const p = fetchWithRetry("https://x.example/", undefined, { baseDelayMs: 100 });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns the last response after exhausting retries on retryable status", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));
    const p = fetchWithRetry("https://x.example/", undefined, {
      baseDelayMs: 100,
      maxRetries: 2,
    });
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after exhausting retries on network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const p = fetchWithRetry("https://x.example/", undefined, {
      baseDelayMs: 100,
      maxRetries: 2,
    });
    const expectation = expect(p).rejects.toThrow("offline");
    await vi.runAllTimersAsync();
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("honours numeric Retry-After header over computed backoff", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(429, { "Retry-After": "5" }));
    fetchMock.mockResolvedValueOnce(okResponse());
    const p = fetchWithRetry("https://x.example/", undefined, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await p;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry on AbortError", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    await expect(fetchWithRetry("https://x.example/")).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a pending backoff when the caller signals abort", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));
    const controller = new AbortController();
    const p = fetchWithRetry(
      "https://x.example/",
      { signal: controller.signal },
      { baseDelayMs: 10_000 },
    );
    // Attach a catch handler synchronously so the rejection isn't flagged as
    // unhandled when the abort fires below.
    const settled = p.catch((e: unknown) => e);
    // First fetch call happens, then we sit in sleep(). Abort now.
    controller.abort();
    const err = await settled;
    expect((err as { name?: string }).name).toBe("AbortError");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("grows backoff exponentially between retries", async () => {
    fetchMock.mockResolvedValue(errorResponse(503));
    // Pick a deterministic mid-range jitter: 0.5 means the computed delay is
    // exactly half the exp cap, which lets us assert precise timing.
    // delay(attempt) = floor(0.5 * min(maxDelay, base * 2^attempt))
    //   attempt 0 -> 50ms, attempt 1 -> 100ms, attempt 2 -> 200ms
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const p = fetchWithRetry("https://x.example/", undefined, {
      baseDelayMs: 100,
      maxRetries: 3,
      maxDelayMs: 10_000,
    });
    // attempt 0: 50ms wait before retry
    await vi.advanceTimersByTimeAsync(49);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // attempt 1: 100ms wait
    await vi.advanceTimersByTimeAsync(99);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // attempt 2: 200ms wait, then the final attempt returns the 503
    await vi.runAllTimersAsync();
    const r = await p;
    expect(r.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe("parseRetryAfterMs", () => {
  it("returns null for null/empty/invalid input", () => {
    const now = Date.now();
    expect(parseRetryAfterMs(null, now)).toBeNull();
    expect(parseRetryAfterMs("", now)).toBeNull();
    expect(parseRetryAfterMs("   ", now)).toBeNull();
    expect(parseRetryAfterMs("tomorrow", now)).toBeNull();
  });

  it("parses delta-seconds form", () => {
    const now = Date.now();
    expect(parseRetryAfterMs("0", now)).toBe(0);
    expect(parseRetryAfterMs("5", now)).toBe(5000);
    expect(parseRetryAfterMs("120", now)).toBe(120_000);
  });

  it("rejects negative and non-integer seconds", () => {
    const now = Date.now();
    expect(parseRetryAfterMs("-5", now)).toBeNull();
    expect(parseRetryAfterMs("1.5", now)).toBeNull();
  });

  it("parses HTTP-date relative to the provided date", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const plus10s = new Date(now + 10_000).toUTCString();
    expect(parseRetryAfterMs(plus10s, now)).toBe(10_000);
  });

  it("returns 0 when the HTTP-date is already in the past", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const minus10s = new Date(now - 10_000).toUTCString();
    expect(parseRetryAfterMs(minus10s, now)).toBe(0);
  });
});
