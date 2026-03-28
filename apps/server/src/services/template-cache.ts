/**
 * Template cache service.
 *
 * Caches Claude API field detection results keyed by document
 * fingerprint hash. Reduces costs and latency for repeat scans
 * of the same form template.
 */

import type { AnalyzeResponse } from './claude.js';

// ─── Types ─────────────────────────────────────────────────────────

interface CacheEntry {
  response: AnalyzeResponse;
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}

export interface TemplateCacheConfig {
  /** Time-to-live in milliseconds. @default 604800000 (7 days) */
  ttlMs?: number;
  /** Maximum number of cached templates. @default 500 */
  maxSize?: number;
}

// ─── Service ───────────────────────────────────────────────────────

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_SIZE = 500;

export class TemplateCache {
  private cache = new Map<string, CacheEntry>();
  private ttlMs: number;
  private maxSize: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(config?: TemplateCacheConfig) {
    this.ttlMs = config?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxSize = config?.maxSize ?? DEFAULT_MAX_SIZE;
  }

  /**
   * Look up cached field detection results by fingerprint hash.
   *
   * Returns the cached response if found and not expired, or null on miss.
   */
  get(fingerprint: string): AnalyzeResponse | null {
    const entry = this.cache.get(fingerprint);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.cache.delete(fingerprint);
      this.stats.misses++;
      this.stats.evictions++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.response;
  }

  /**
   * Store field detection results for a document fingerprint.
   *
   * Evicts the oldest entry if the cache is at capacity.
   */
  set(fingerprint: string, response: AnalyzeResponse): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(fingerprint)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(fingerprint, {
      response,
      createdAt: Date.now(),
      hits: 0,
    });
  }

  /** Invalidate a specific cached template. */
  invalidate(fingerprint: string): boolean {
    return this.cache.delete(fingerprint);
  }

  /** Clear the entire cache. */
  clear(): void {
    this.cache.clear();
  }

  /** Get cache statistics. */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      ...this.stats,
    };
  }

  /** Reset statistics counters. */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }
}
