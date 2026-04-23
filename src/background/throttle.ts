export class Throttle {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillInterval: number;
  private lastRefill: number;
  private pauseUntil = 0;
  private readonly onPauseChange: ((pauseUntil: number) => void) | undefined;

  constructor(
    capacity: number,
    refillIntervalMs: number,
    onPauseChange?: (pauseUntil: number) => void,
  ) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillInterval = refillIntervalMs;
    this.lastRefill = Date.now();
    this.onPauseChange = onPauseChange;
  }

  pauseFor(ms: number): void {
    const next = Math.max(this.pauseUntil, Date.now() + ms);
    if (next !== this.pauseUntil) {
      this.pauseUntil = next;
      this.onPauseChange?.(this.pauseUntil);
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    return fn();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const gained = Math.floor(elapsed / this.refillInterval);
    if (gained > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + gained);
      this.lastRefill += gained * this.refillInterval;
    }
  }

  private waitForSlot(): Promise<void> {
    return new Promise((resolve) => {
      const attempt = (): void => {
        const now = Date.now();
        if (now < this.pauseUntil) {
          setTimeout(attempt, this.pauseUntil - now);
          return;
        }
        this.refill();
        if (this.tokens > 0) {
          this.tokens -= 1;
          resolve();
          return;
        }
        const delay = this.refillInterval - (now - this.lastRefill);
        setTimeout(attempt, Math.max(1, delay));
      };
      attempt();
    });
  }
}
