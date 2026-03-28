/**
 * Analytics logging service.
 *
 * Structured JSON logging for usage metrics without PII.
 * Tracks analyze requests, cache performance, errors, and
 * auth events for system health monitoring.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error';

export type EventType =
  | 'analyze_request'
  | 'analyze_complete'
  | 'analyze_error'
  | 'cache_hit'
  | 'cache_miss'
  | 'auth_success'
  | 'auth_failure'
  | 'rate_limit_hit';

export interface AnalyticsEvent {
  event: EventType;
  level: LogLevel;
  timestamp: string;
  /** Hashed or anonymized user identifier — never raw email or name. */
  userId?: string;
  /** Request ID for correlation. */
  requestId?: string;
  /** Event-specific data (must not contain PII). */
  data?: Record<string, unknown>;
}

export interface AnalyticsStats {
  totalEvents: number;
  eventCounts: Record<EventType, number>;
  errorCount: number;
  startedAt: string;
}

// ─── Service ───────────────────────────────────────────────────────

class AnalyticsService {
  private eventCounts: Record<string, number> = {};
  private totalEvents = 0;
  private errorCount = 0;
  private startedAt = new Date().toISOString();

  /**
   * Log an analytics event as structured JSON.
   *
   * All events are written to stdout as single-line JSON objects,
   * suitable for ingestion by log aggregation services (CloudWatch,
   * Datadog, Render logs, etc.).
   */
  log(event: EventType, level: LogLevel, data?: Record<string, unknown>): void {
    const entry: AnalyticsEvent = {
      event,
      level,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Strip any fields that could contain PII
    const safe = this.stripPii(entry);

    // Write to appropriate log stream
    const output = JSON.stringify(safe);
    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }

    // Update counters
    this.totalEvents++;
    this.eventCounts[event] = (this.eventCounts[event] ?? 0) + 1;
    if (level === 'error') {
      this.errorCount++;
    }
  }

  /** Log an analyze request event. */
  logAnalyzeRequest(opts: {
    requestId?: string;
    userId?: string;
    pageCount: number;
    ocrBlockCount: number;
  }): void {
    this.log('analyze_request', 'info', {
      requestId: opts.requestId,
      userId: opts.userId,
      data: { pageCount: opts.pageCount, ocrBlockCount: opts.ocrBlockCount },
    });
  }

  /** Log a successful analyze completion. */
  logAnalyzeComplete(opts: {
    requestId?: string;
    userId?: string;
    fieldCount: number;
    cached: boolean;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
  }): void {
    this.log('analyze_complete', 'info', {
      requestId: opts.requestId,
      userId: opts.userId,
      data: {
        fieldCount: opts.fieldCount,
        cached: opts.cached,
        durationMs: opts.durationMs,
        inputTokens: opts.inputTokens,
        outputTokens: opts.outputTokens,
      },
    });
  }

  /** Log an analyze error. */
  logAnalyzeError(opts: {
    requestId?: string;
    userId?: string;
    errorCode: string;
    errorMessage: string;
  }): void {
    this.log('analyze_error', 'error', {
      requestId: opts.requestId,
      userId: opts.userId,
      data: { errorCode: opts.errorCode, errorMessage: opts.errorMessage },
    });
  }

  /** Log a cache hit. */
  logCacheHit(opts: { fingerprint: string; requestId?: string }): void {
    this.log('cache_hit', 'info', {
      requestId: opts.requestId,
      data: { fingerprint: opts.fingerprint },
    });
  }

  /** Log a cache miss. */
  logCacheMiss(opts: { fingerprint: string; requestId?: string }): void {
    this.log('cache_miss', 'info', {
      requestId: opts.requestId,
      data: { fingerprint: opts.fingerprint },
    });
  }

  /** Log an auth event. */
  logAuth(success: boolean, opts: { provider: string; requestId?: string }): void {
    this.log(success ? 'auth_success' : 'auth_failure', success ? 'info' : 'warn', {
      requestId: opts.requestId,
      data: { provider: opts.provider },
    });
  }

  /** Log a rate limit hit. */
  logRateLimit(opts: { userId?: string; requestId?: string }): void {
    this.log('rate_limit_hit', 'warn', {
      requestId: opts.requestId,
      userId: opts.userId,
    });
  }

  /** Get aggregate statistics. */
  getStats(): AnalyticsStats {
    return {
      totalEvents: this.totalEvents,
      eventCounts: { ...this.eventCounts } as Record<EventType, number>,
      errorCount: this.errorCount,
      startedAt: this.startedAt,
    };
  }

  /** Reset counters (for testing). */
  resetStats(): void {
    this.eventCounts = {};
    this.totalEvents = 0;
    this.errorCount = 0;
    this.startedAt = new Date().toISOString();
  }

  // ─── Private ───────────────────────────────────────────────────

  private stripPii(entry: AnalyticsEvent): AnalyticsEvent {
    const cleaned = { ...entry };
    // Ensure no email, name, phone, or ID number leaks into logs
    if (cleaned.data) {
      const piiKeys = ['email', 'name', 'phone', 'idNumber', 'address', 'password'];
      for (const key of piiKeys) {
        delete cleaned.data[key];
      }
    }
    return cleaned;
  }
}

/** Singleton analytics service instance. */
export const analytics = new AnalyticsService();
