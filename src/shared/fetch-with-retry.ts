export interface FetchWithRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const RETRYABLE_STATUSES: ReadonlySet<number> = new Set([408, 429, 500, 502, 503, 504]);

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

function computeBackoffMs(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

/**
 * @param header Retry-After header is either `delta-seconds` or an `http-date`.
 * @param now Current time in milliseconds
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After
 */
export function parseRetryAfterMs(header: string | null, now: number): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed === "") return null;
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  }
  // HTTP-date always carries alphabetic tokens (weekday, month name, "GMT").
  // Without this guard, Date.parse accepts bare signed/decimal numbers like
  // "-5" or "1.5" as ambiguous year values across engines.
  if (!/[a-zA-Z]/.test(trimmed)) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed - now);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  function getRejectReason(signal?: AbortSignal) {
    return signal?.aborted && signal?.reason
      ? signal.reason
      : new DOMException("aborted", "AbortError");
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(getRejectReason(signal));
      return;
    }
    const timer = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(getRejectReason(signal));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 10_000;
  const signal = init?.signal ?? undefined;

  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(input, init);
      if (!RETRYABLE_STATUSES.has(response.status)) return response;
      if (attempt >= maxRetries) return response;
      const retryAfter = parseRetryAfterMs(response.headers.get("Retry-After"), Date.now());
      const delay = retryAfter ?? computeBackoffMs(attempt, baseDelay, maxDelay);
      await sleep(delay, signal);
    } catch (e) {
      if (isAbortError(e)) throw e;
      if (attempt >= maxRetries) throw e;
      const delay = computeBackoffMs(attempt, baseDelay, maxDelay);
      await sleep(delay, signal);
    }
    attempt++;
  }
}
