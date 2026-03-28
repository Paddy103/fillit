import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics } from '../services/analytics.js';

describe('AnalyticsService', () => {
  beforeEach(() => {
    analytics.resetStats();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log', () => {
    it('should write JSON to console.log for info level', () => {
      analytics.log('analyze_request', 'info', { data: { pageCount: 2 } });

      expect(console.log).toHaveBeenCalledOnce();
      const output = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(output.event).toBe('analyze_request');
      expect(output.level).toBe('info');
      expect(output.timestamp).toBeTruthy();
    });

    it('should write to console.warn for warn level', () => {
      analytics.log('rate_limit_hit', 'warn');
      expect(console.warn).toHaveBeenCalledOnce();
    });

    it('should write to console.error for error level', () => {
      analytics.log('analyze_error', 'error');
      expect(console.error).toHaveBeenCalledOnce();
    });

    it('should strip PII fields from data', () => {
      analytics.log('analyze_request', 'info', {
        data: { pageCount: 1, email: 'user@test.com', name: 'John', phone: '0821234567' },
      });

      const output = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(output.data.email).toBeUndefined();
      expect(output.data.name).toBeUndefined();
      expect(output.data.phone).toBeUndefined();
      expect(output.data.pageCount).toBe(1);
    });
  });

  describe('convenience methods', () => {
    it('should log analyze request', () => {
      analytics.logAnalyzeRequest({
        requestId: 'req-1',
        pageCount: 3,
        ocrBlockCount: 25,
      });

      const output = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(output.event).toBe('analyze_request');
      expect(output.data.pageCount).toBe(3);
      expect(output.data.ocrBlockCount).toBe(25);
    });

    it('should log analyze complete', () => {
      analytics.logAnalyzeComplete({
        fieldCount: 10,
        cached: false,
        durationMs: 2500,
        inputTokens: 500,
        outputTokens: 200,
      });

      const output = JSON.parse((console.log as any).mock.calls[0][0]);
      expect(output.event).toBe('analyze_complete');
      expect(output.data.fieldCount).toBe(10);
      expect(output.data.cached).toBe(false);
      expect(output.data.durationMs).toBe(2500);
    });

    it('should log analyze error', () => {
      analytics.logAnalyzeError({
        errorCode: 'TIMEOUT',
        errorMessage: 'Claude API timeout',
      });

      expect(console.error).toHaveBeenCalledOnce();
      const output = JSON.parse((console.error as any).mock.calls[0][0]);
      expect(output.event).toBe('analyze_error');
      expect(output.level).toBe('error');
    });

    it('should log cache hit and miss', () => {
      analytics.logCacheHit({ fingerprint: 'abc123' });
      analytics.logCacheMiss({ fingerprint: 'def456' });

      expect(console.log).toHaveBeenCalledTimes(2);
    });

    it('should log auth events', () => {
      analytics.logAuth(true, { provider: 'google' });
      analytics.logAuth(false, { provider: 'apple' });

      expect(console.log).toHaveBeenCalledOnce(); // success = info
      expect(console.warn).toHaveBeenCalledOnce(); // failure = warn
    });

    it('should log rate limit hit', () => {
      analytics.logRateLimit({ userId: 'user-1' });
      expect(console.warn).toHaveBeenCalledOnce();
    });
  });

  describe('stats', () => {
    it('should track total events', () => {
      analytics.log('analyze_request', 'info');
      analytics.log('cache_hit', 'info');
      analytics.log('analyze_error', 'error');

      const stats = analytics.getStats();
      expect(stats.totalEvents).toBe(3);
    });

    it('should track event counts by type', () => {
      analytics.log('cache_hit', 'info');
      analytics.log('cache_hit', 'info');
      analytics.log('cache_miss', 'info');

      const stats = analytics.getStats();
      expect(stats.eventCounts.cache_hit).toBe(2);
      expect(stats.eventCounts.cache_miss).toBe(1);
    });

    it('should track error count', () => {
      analytics.log('analyze_error', 'error');
      analytics.log('analyze_error', 'error');
      analytics.log('analyze_request', 'info');

      expect(analytics.getStats().errorCount).toBe(2);
    });

    it('should include startedAt timestamp', () => {
      const stats = analytics.getStats();
      expect(stats.startedAt).toBeTruthy();
      expect(new Date(stats.startedAt).getTime()).toBeGreaterThan(0);
    });

    it('should reset stats', () => {
      analytics.log('analyze_request', 'info');
      analytics.log('analyze_error', 'error');
      analytics.resetStats();

      const stats = analytics.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });
});
