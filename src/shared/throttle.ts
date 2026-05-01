export const MAX_PAUSE_FOR_MS = 5 * 60 * 1000; // 5 Minute

/**
 * Token-bucket throttle with an optional "pause for N ms" backoff window.
 *
 * `capacity` tokens refill at one token per `refillIntervalMs`. `run(fn)` waits
 * until a token is available (or the pause window ends), consumes one, and
 * invokes `fn`. `pauseFor(ms)` extends a hard pause that blocks every waiter
 * until it expires - used to back off after a 429/quota response. `onPauseChange`
 * fires whenever `pauseUntil` advances, so callers can persist it across MV3
 * service worker hibernation.
 */
export class Throttle {
  #tokens: number;
  readonly #capacity: number;
  readonly #refillInterval: number;
  #lastRefill: number;
  #pauseUntil = 0;
  readonly #onPauseChange: ((pauseUntil: number) => void) | undefined;

  constructor(
    capacity: number,
    refillIntervalMs: number,
    onPauseChange?: (pauseUntil: number) => void,
  ) {
    this.#capacity = capacity;
    this.#tokens = capacity;
    this.#refillInterval = refillIntervalMs;
    this.#lastRefill = Date.now();
    this.#onPauseChange = onPauseChange;
  }

  pauseFor(ms: number): void {
    if (!Number.isFinite(ms) || ms <= 0) return;
    const pauseForMs = Math.min(ms, MAX_PAUSE_FOR_MS);
    const next = Math.max(this.#pauseUntil, Date.now() + pauseForMs);
    if (next !== this.#pauseUntil) {
      this.#pauseUntil = next;
      this.#onPauseChange?.(this.#pauseUntil);
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.#waitForSlot();
    return fn();
  }

  #refill(now: number): void {
    const elapsed = now - this.#lastRefill;
    const gained = Math.floor(elapsed / this.#refillInterval);
    if (gained > 0) {
      this.#tokens = Math.min(this.#capacity, this.#tokens + gained);
      this.#lastRefill += gained * this.#refillInterval;
    }
  }

  #waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const attempt = (): void => {
        const now = Date.now();
        if (now < this.#pauseUntil) {
          setTimeout(attempt, this.#pauseUntil - now);
          return;
        }
        this.#refill(now);
        if (this.#tokens > 0) {
          this.#tokens -= 1;
          resolve();
          return;
        }
        const elapsed = now - this.#lastRefill;
        const delay = this.#refillInterval - elapsed;
        setTimeout(attempt, Math.max(1, delay));
      };
      attempt();
    });
  }
}
