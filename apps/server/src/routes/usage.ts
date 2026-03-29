/**
 * Usage stats API route.
 *
 * GET /api/usage — Returns authenticated user's usage statistics
 * with daily, monthly, and all-time breakdowns.
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { usageStats } from '../services/usage-stats.js';

export const usageRoutes = new Hono<AppEnv>();

/**
 * GET /usage
 *
 * Returns the authenticated user's usage statistics.
 * Requires authentication (userId from auth middleware).
 */
usageRoutes.get('/usage', (c) => {
  const userId = c.get('userId');
  const stats = usageStats.getStats(userId);

  return c.json({
    success: true,
    data: stats,
  });
});
