/**
 * Tests for usage stats service and endpoint.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usageStats } from '../services/usage-stats.js';

describe('UsageStatsService', () => {
  beforeEach(() => {
    usageStats.resetAll();
  });

  describe('record', () => {
    it('should record a basic usage event', () => {
      usageStats.record({ userId: 'user-1', cached: false });

      const stats = usageStats.getStats('user-1');
      expect(stats.allTime.requestCount).toBe(1);
      expect(stats.allTime.cacheHits).toBe(0);
    });

    it('should track cache hits', () => {
      usageStats.record({ userId: 'user-1', cached: true });

      const stats = usageStats.getStats('user-1');
      expect(stats.allTime.cacheHits).toBe(1);
      expect(stats.allTime.requestCount).toBe(1);
    });

    it('should accumulate token usage', () => {
      usageStats.record({
        userId: 'user-1',
        cached: false,
        inputTokens: 100,
        outputTokens: 50,
      });
      usageStats.record({
        userId: 'user-1',
        cached: false,
        inputTokens: 200,
        outputTokens: 75,
      });

      const stats = usageStats.getStats('user-1');
      expect(stats.allTime.inputTokens).toBe(300);
      expect(stats.allTime.outputTokens).toBe(125);
      expect(stats.allTime.requestCount).toBe(2);
    });

    it('should track errors', () => {
      usageStats.record({ userId: 'user-1', cached: false, isError: true });

      const stats = usageStats.getStats('user-1');
      expect(stats.allTime.errorCount).toBe(1);
    });

    it('should track per-day stats', () => {
      usageStats.record({ userId: 'user-1', cached: false });

      const stats = usageStats.getStats('user-1');
      expect(stats.today.requestCount).toBe(1);
    });

    it('should track per-month stats', () => {
      usageStats.record({ userId: 'user-1', cached: true });

      const stats = usageStats.getStats('user-1');
      expect(stats.thisMonth.requestCount).toBe(1);
      expect(stats.thisMonth.cacheHits).toBe(1);
    });

    it('should isolate users', () => {
      usageStats.record({ userId: 'user-1', cached: false });
      usageStats.record({ userId: 'user-2', cached: false });
      usageStats.record({ userId: 'user-2', cached: false });

      expect(usageStats.getStats('user-1').allTime.requestCount).toBe(1);
      expect(usageStats.getStats('user-2').allTime.requestCount).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return empty stats for unknown user', () => {
      const stats = usageStats.getStats('unknown');

      expect(stats.userId).toBe('unknown');
      expect(stats.allTime.requestCount).toBe(0);
      expect(stats.today.requestCount).toBe(0);
      expect(stats.thisMonth.requestCount).toBe(0);
    });

    it('should include timestamps', () => {
      usageStats.record({ userId: 'user-1', cached: false });

      const stats = usageStats.getStats('user-1');
      expect(stats.firstSeenAt).toBeDefined();
      expect(stats.lastActivityAt).toBeDefined();
      expect(new Date(stats.firstSeenAt).getTime()).toBeGreaterThan(0);
    });
  });

  describe('resetUser', () => {
    it('should reset a specific user', () => {
      usageStats.record({ userId: 'user-1', cached: false });
      usageStats.record({ userId: 'user-2', cached: false });

      usageStats.resetUser('user-1');

      expect(usageStats.getStats('user-1').allTime.requestCount).toBe(0);
      expect(usageStats.getStats('user-2').allTime.requestCount).toBe(1);
    });
  });
});
