/**
 * Per-user usage statistics service.
 *
 * Tracks API request counts, cache hits, and token usage per user
 * with daily and monthly breakdowns. In-memory storage — resets
 * on server restart (suitable for MVP, upgrade to Redis/DB later).
 */

// ─── Types ─────────────────────────────────────────────────────────

export interface UsagePeriod {
  /** Total analyze requests in this period. */
  requestCount: number;
  /** Number of cache hits (no Claude API call needed). */
  cacheHits: number;
  /** Total input tokens consumed (Claude API). */
  inputTokens: number;
  /** Total output tokens consumed (Claude API). */
  outputTokens: number;
  /** Number of errors encountered. */
  errorCount: number;
}

export interface UserUsageStats {
  userId: string;
  /** Stats for the current day (UTC). */
  today: UsagePeriod;
  /** Stats for the current month (UTC). */
  thisMonth: UsagePeriod;
  /** All-time cumulative stats. */
  allTime: UsagePeriod;
  /** When the user's stats were first recorded. */
  firstSeenAt: string;
  /** When the user's stats were last updated. */
  lastActivityAt: string;
}

export interface RecordUsageInput {
  userId: string;
  cached: boolean;
  inputTokens?: number;
  outputTokens?: number;
  isError?: boolean;
}

// ─── Internal Types ───────────────────────────────────────────────

interface UserRecord {
  allTime: UsagePeriod;
  /** Daily stats keyed by YYYY-MM-DD. */
  daily: Map<string, UsagePeriod>;
  /** Monthly stats keyed by YYYY-MM. */
  monthly: Map<string, UsagePeriod>;
  firstSeenAt: string;
  lastActivityAt: string;
}

// ─── Service ──────────────────────────────────────────────────────

class UsageStatsService {
  private users = new Map<string, UserRecord>();

  /**
   * Record a usage event for a user.
   */
  record(input: RecordUsageInput): void {
    const record = this.getOrCreateRecord(input.userId);
    const now = new Date();
    const dayKey = toDateKey(now);
    const monthKey = toMonthKey(now);

    // Get or create period records
    const daily = getOrCreatePeriod(record.daily, dayKey);
    const monthly = getOrCreatePeriod(record.monthly, monthKey);

    // Update all periods
    const periods = [record.allTime, daily, monthly];
    for (const period of periods) {
      period.requestCount++;
      if (input.cached) period.cacheHits++;
      if (input.inputTokens) period.inputTokens += input.inputTokens;
      if (input.outputTokens) period.outputTokens += input.outputTokens;
      if (input.isError) period.errorCount++;
    }

    record.lastActivityAt = now.toISOString();
  }

  /**
   * Get usage stats for a user.
   */
  getStats(userId: string): UserUsageStats {
    const record = this.users.get(userId);
    const now = new Date();
    const dayKey = toDateKey(now);
    const monthKey = toMonthKey(now);

    if (!record) {
      return {
        userId,
        today: emptyPeriod(),
        thisMonth: emptyPeriod(),
        allTime: emptyPeriod(),
        firstSeenAt: now.toISOString(),
        lastActivityAt: now.toISOString(),
      };
    }

    return {
      userId,
      today: record.daily.get(dayKey) ?? emptyPeriod(),
      thisMonth: record.monthly.get(monthKey) ?? emptyPeriod(),
      allTime: { ...record.allTime },
      firstSeenAt: record.firstSeenAt,
      lastActivityAt: record.lastActivityAt,
    };
  }

  /**
   * Reset stats for a user (for testing).
   */
  resetUser(userId: string): void {
    this.users.delete(userId);
  }

  /**
   * Reset all stats (for testing).
   */
  resetAll(): void {
    this.users.clear();
  }

  // ─── Private ─────────────────────────────────────────────────

  private getOrCreateRecord(userId: string): UserRecord {
    let record = this.users.get(userId);
    if (!record) {
      record = {
        allTime: emptyPeriod(),
        daily: new Map(),
        monthly: new Map(),
        firstSeenAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      };
      this.users.set(userId, record);
    }
    return record;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function emptyPeriod(): UsagePeriod {
  return {
    requestCount: 0,
    cacheHits: 0,
    inputTokens: 0,
    outputTokens: 0,
    errorCount: 0,
  };
}

function getOrCreatePeriod(map: Map<string, UsagePeriod>, key: string): UsagePeriod {
  let period = map.get(key);
  if (!period) {
    period = emptyPeriod();
    map.set(key, period);
  }
  return period;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Singleton usage stats service instance. */
export const usageStats = new UsageStatsService();
