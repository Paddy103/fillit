import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { RateLimiter, RATE_LIMIT_TIERS } from '../services/rate-limiter.js';
import { createRateLimitMiddleware } from '../middleware/rate-limit.js';

// ─── RateLimiter service ───────────────────────────────────────────

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ maxRequests: 3, windowMs: 1000 });
  });

  it('should allow requests within the limit', () => {
    const r1 = limiter.check('user-1');
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r1.limit).toBe(3);

    const r2 = limiter.check('user-1');
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = limiter.check('user-1');
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('should reject requests over the limit', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');

    const r4 = limiter.check('user-1');
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('should track users independently', () => {
    limiter.check('user-1');
    limiter.check('user-1');
    limiter.check('user-1');

    const result = limiter.check('user-2');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should reset after the window expires', async () => {
    const shortLimiter = new RateLimiter({ maxRequests: 1, windowMs: 50 });
    shortLimiter.check('user-1');

    const blocked = shortLimiter.check('user-1');
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    const allowed = shortLimiter.check('user-1');
    expect(allowed.allowed).toBe(true);
  });

  it('should support custom tiers', () => {
    const premiumTier = { maxRequests: 100, windowMs: 60_000 };
    const result = limiter.check('user-1', premiumTier);
    expect(result.limit).toBe(100);
    expect(result.remaining).toBe(99);
  });

  it('should provide a resetAt timestamp', () => {
    const result = limiter.check('user-1');
    expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should clear all records', () => {
    limiter.check('user-1');
    limiter.check('user-2');
    expect(limiter.size).toBe(2);

    limiter.clear();
    expect(limiter.size).toBe(0);
  });
});

describe('RATE_LIMIT_TIERS', () => {
  it('should define free and premium tiers', () => {
    expect(RATE_LIMIT_TIERS.free).toBeDefined();
    expect(RATE_LIMIT_TIERS.free!.maxRequests).toBe(10);
    expect(RATE_LIMIT_TIERS.premium).toBeDefined();
    expect(RATE_LIMIT_TIERS.premium!.maxRequests).toBe(60);
  });
});

// ─── Rate limit middleware ─────────────────────────────────────────

describe('createRateLimitMiddleware', () => {
  function createApp(limiter: RateLimiter) {
    const app = new Hono<AppEnv>();
    // Simulate auth setting userId
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user');
      c.set('authProvider', 'dev');
      await next();
    });
    app.use('*', createRateLimitMiddleware(limiter));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      const status = 'statusCode' in err ? (err as any).statusCode : 500;
      return c.json({ error: err.message }, status);
    });
    return app;
  }

  it('should set rate limit headers on allowed requests', async () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60_000 });
    const app = createApp(limiter);

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy();
  });

  it('should return 429 when limit is exceeded', async () => {
    const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60_000 });
    const app = createApp(limiter);

    await app.request('/test');
    await app.request('/test');
    const res = await app.request('/test');

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Rate limit exceeded');
  });

  it('should set headers even on 429 responses', async () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    const app = createApp(limiter);

    await app.request('/test');
    const res = await app.request('/test');

    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('1');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
  });

  it('should decrement remaining with each request', async () => {
    const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60_000 });
    const app = createApp(limiter);

    const r1 = await app.request('/test');
    expect(r1.headers.get('X-RateLimit-Remaining')).toBe('2');

    const r2 = await app.request('/test');
    expect(r2.headers.get('X-RateLimit-Remaining')).toBe('1');

    const r3 = await app.request('/test');
    expect(r3.headers.get('X-RateLimit-Remaining')).toBe('0');
  });
});

// ─── App integration ───────────────────────────────────────────────

describe('app rate limit integration', () => {
  it('should not rate limit public routes', async () => {
    process.env.AUTH_DEV_TOKENS = 'true';
    const app = (await import('../app.js')).default;

    // Public routes should never be rate limited
    for (let i = 0; i < 15; i++) {
      const res = await app.request('/health');
      expect(res.status).toBe(200);
    }
  });

  it('should include rate limit headers on /api/* routes', async () => {
    process.env.AUTH_DEV_TOKENS = 'true';
    const app = (await import('../app.js')).default;

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer dev:rate-test-user' },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBeTruthy();
    expect(res.headers.get('X-RateLimit-Remaining')).toBeTruthy();
  });
});
