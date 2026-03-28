/**
 * Per-user rate limiting middleware.
 *
 * Uses the userId from the auth context to track request counts.
 * Sets standard rate limit headers on every response and returns
 * 429 when the limit is exceeded.
 */

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';
import { RateLimiter, type RateLimitTier } from '../services/rate-limiter.js';
import { TooManyRequestsError } from '../utils/errors.js';

/**
 * Create a rate limiting middleware with the given limiter and optional tier.
 *
 * Must be applied after the auth middleware so that `c.get('userId')` is available.
 */
export function createRateLimitMiddleware(limiter: RateLimiter, tier?: RateLimitTier) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const userId = c.get('userId');
    const key = userId || c.req.header('X-Forwarded-For') || 'anonymous';

    const result = limiter.check(key, tier);

    // Always set rate limit headers
    c.header('X-RateLimit-Limit', String(result.limit));
    c.header('X-RateLimit-Remaining', String(result.remaining));
    c.header('X-RateLimit-Reset', String(result.resetAt));

    if (!result.allowed) {
      throw new TooManyRequestsError('Rate limit exceeded. Please try again later.');
    }

    await next();
  });
}
