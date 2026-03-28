/**
 * In-memory sliding window rate limiter.
 *
 * Tracks request counts per key (typically userId) within a
 * configurable time window. Supports multiple tiers with
 * different limits.
 */

/** Rate limit configuration for a single tier. */
export interface RateLimitTier {
  /** Maximum requests allowed in the window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/** Predefined tier configurations. */
export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: { maxRequests: 10, windowMs: 60_000 },
  premium: { maxRequests: 60, windowMs: 60_000 },
};

/** Result of a rate limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Maximum requests in the window. */
  limit: number;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Unix timestamp (seconds) when the window resets. */
  resetAt: number;
}

/** Internal record of request timestamps for a single key. */
interface RequestRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records = new Map<string, RequestRecord>();
  private defaultTier: RateLimitTier;

  constructor(defaultTier: RateLimitTier = RATE_LIMIT_TIERS.free!) {
    this.defaultTier = defaultTier;
  }

  /**
   * Check and consume a rate limit token for the given key.
   *
   * Prunes expired timestamps and evicts empty records to prevent
   * unbounded memory growth. Checks if the request is within the
   * limit, and if allowed, records the new timestamp.
   */
  check(key: string, tier?: RateLimitTier): RateLimitResult {
    const { maxRequests, windowMs } = tier ?? this.defaultTier;
    const now = Date.now();
    const windowStart = now - windowMs;

    const record = this.records.get(key);

    if (record) {
      // Prune expired timestamps
      record.timestamps = record.timestamps.filter((t) => t > windowStart);

      // Evict empty records to prevent unbounded memory growth
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }

    const active = this.records.get(key);
    const currentCount = active?.timestamps.length ?? 0;

    const resetAt =
      active && active.timestamps.length > 0
        ? Math.ceil((active.timestamps[0]! + windowMs) / 1000)
        : Math.ceil((now + windowMs) / 1000);

    if (currentCount >= maxRequests) {
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        resetAt,
      };
    }

    // Consume a token — create record if needed
    if (!active) {
      this.records.set(key, { timestamps: [now] });
    } else {
      active.timestamps.push(now);
    }

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - (currentCount + 1),
      resetAt,
    };
  }

  /** Clear all records (for testing). */
  clear(): void {
    this.records.clear();
  }

  /** Get the number of tracked keys (for monitoring). */
  get size(): number {
    return this.records.size;
  }
}
