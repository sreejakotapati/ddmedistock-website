// Rate limiting — fixed-window counter.
//
// Pure and dependency-free so it runs in edge middleware and is unit-testable.
// Uses an in-memory store (per server instance); for multi-instance production
// swap `MemoryStore` for a Redis-backed store implementing the same interface.
// The algorithm is a fixed window: N requests per `windowMs` per key.

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix ms when the current window resets. */
  resetAt: number;
  /** Seconds until reset (for Retry-After), 0 when allowed. */
  retryAfter: number;
};

export interface RateLimitStore {
  /** Increment the counter for key, returning the new count and window reset. */
  hit(key: string, windowMs: number, now: number): { count: number; resetAt: number };
}

/** In-memory fixed-window store. Self-prunes expired windows on access. */
export class MemoryStore implements RateLimitStore {
  private windows = new Map<string, { count: number; resetAt: number }>();

  hit(key: string, windowMs: number, now: number) {
    const existing = this.windows.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.windows.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  /** Drop expired windows to bound memory. */
  prune(now: number): void {
    for (const [k, v] of this.windows) if (v.resetAt <= now) this.windows.delete(k);
  }

  get size() {
    return this.windows.size;
  }
}

export type RateLimiterOptions = {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  store?: RateLimitStore;
};

export class RateLimiter {
  readonly limit: number;
  readonly windowMs: number;
  private store: RateLimitStore;

  constructor(opts: RateLimiterOptions) {
    this.limit = opts.limit;
    this.windowMs = opts.windowMs;
    this.store = opts.store ?? new MemoryStore();
  }

  /** Record a hit for `key` and report whether it is within the limit. */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const { count, resetAt } = this.store.hit(key, this.windowMs, now);
    const allowed = count <= this.limit;
    return {
      allowed,
      limit: this.limit,
      remaining: Math.max(0, this.limit - count),
      resetAt,
      retryAfter: allowed ? 0 : Math.ceil((resetAt - now) / 1000),
    };
  }
}

// Shared limiters. Auth endpoints are stricter (brute-force defence) than the
// general API surface. Limits are env-configurable: production may need a
// higher auth limit for users behind shared/corporate NAT (many people on one
// egress IP), and test/CI environments set a high value so a browser E2E suite
// running many logins from one IP isn't throttled.
const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const authLimiter = new RateLimiter({
  limit: num(process.env.AUTH_RATE_LIMIT, 10),
  windowMs: 60_000,
});
export const apiLimiter = new RateLimiter({
  limit: num(process.env.API_RATE_LIMIT, 120),
  windowMs: 60_000,
});

/** Best-effort client IP from common proxy headers. */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") || "unknown";
}
