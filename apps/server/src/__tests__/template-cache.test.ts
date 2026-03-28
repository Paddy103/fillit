import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateCache } from '../services/template-cache.js';
import type { AnalyzeResponse } from '../services/claude.js';

function makeResponse(fieldCount = 2): AnalyzeResponse {
  return {
    fields: Array.from({ length: fieldCount }, (_, i) => ({
      id: `field-${i}`,
      pageNumber: 1,
      label: `Field ${i}`,
      fieldType: 'text' as const,
      bounds: { x: 0.1, y: 0.1 * (i + 1), width: 0.3, height: 0.04 },
      matchedField: `field${i}`,
      matchConfidence: 0.9,
    })),
    documentType: 'test form',
    documentLanguage: 'English',
  };
}

describe('TemplateCache', () => {
  let cache: TemplateCache;

  beforeEach(() => {
    cache = new TemplateCache({ ttlMs: 60_000, maxSize: 5 });
  });

  describe('get/set', () => {
    it('should return null on cache miss', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should return cached response on hit', () => {
      const response = makeResponse();
      cache.set('fp-123', response);
      const result = cache.get('fp-123');
      expect(result).toEqual(response);
    });

    it('should return null for expired entries', () => {
      const shortCache = new TemplateCache({ ttlMs: 1, maxSize: 10 });
      shortCache.set('fp-1', makeResponse());

      // Wait for expiry
      const start = Date.now();
      while (Date.now() - start < 5) {} // busy wait 5ms

      expect(shortCache.get('fp-1')).toBeNull();
    });

    it('should overwrite existing entry with same key', () => {
      cache.set('fp-1', makeResponse(1));
      cache.set('fp-1', makeResponse(3));
      const result = cache.get('fp-1');
      expect(result!.fields).toHaveLength(3);
    });
  });

  describe('eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`fp-${i}`, makeResponse());
      }
      expect(cache.getStats().size).toBe(5);

      // Adding a 6th should evict the oldest (fp-0)
      cache.set('fp-new', makeResponse());
      expect(cache.getStats().size).toBe(5);
      expect(cache.get('fp-0')).toBeNull();
      expect(cache.get('fp-new')).not.toBeNull();
    });

    it('should not evict when updating existing key at capacity', () => {
      for (let i = 0; i < 5; i++) {
        cache.set(`fp-${i}`, makeResponse());
      }
      // Updating fp-0 should not evict anything
      cache.set('fp-0', makeResponse(5));
      expect(cache.getStats().size).toBe(5);
      expect(cache.get('fp-0')!.fields).toHaveLength(5);
    });
  });

  describe('invalidate', () => {
    it('should remove a specific entry', () => {
      cache.set('fp-1', makeResponse());
      expect(cache.invalidate('fp-1')).toBe(true);
      expect(cache.get('fp-1')).toBeNull();
    });

    it('should return false for nonexistent key', () => {
      expect(cache.invalidate('nope')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('fp-1', makeResponse());
      cache.set('fp-2', makeResponse());
      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('stats', () => {
    it('should track hits and misses', () => {
      cache.set('fp-1', makeResponse());
      cache.get('fp-1'); // hit
      cache.get('fp-1'); // hit
      cache.get('fp-miss'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.size).toBe(1);
    });

    it('should track evictions', () => {
      for (let i = 0; i < 6; i++) {
        cache.set(`fp-${i}`, makeResponse());
      }
      expect(cache.getStats().evictions).toBe(1);
    });

    it('should reset stats', () => {
      cache.set('fp-1', makeResponse());
      cache.get('fp-1');
      cache.get('fp-miss');
      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });
});
