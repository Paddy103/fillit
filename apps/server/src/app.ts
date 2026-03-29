import { Hono } from 'hono';
import { APP_NAME } from '@fillit/shared';
import type { AppEnv } from './types.js';
import {
  requestId,
  cors,
  logger,
  errorHandler,
  createAuthMiddleware,
  createRateLimitMiddleware,
} from './middleware/index.js';
import { createVerifiers } from './auth/index.js';
import { RateLimiter, RATE_LIMIT_TIERS } from './services/rate-limiter.js';
import { analyzeRoutes } from './routes/analyze.js';
import { usageRoutes } from './routes/usage.js';

const app = new Hono<AppEnv>();

// Middleware (order matters)
app.use('*', requestId);
app.use('*', cors);
app.use('*', logger);

// Error handler
app.onError(errorHandler);

// Auth middleware — applied to /api/* routes only (health + root stay public)
const verifiers = createVerifiers();
const auth = createAuthMiddleware(verifiers);
app.use('/api/*', auth);

// Rate limiting — applied after auth so userId is available
const rateLimiter = new RateLimiter(RATE_LIMIT_TIERS.free);
app.use('/api/*', createRateLimitMiddleware(rateLimiter));

// Public routes
const startTime = Date.now();

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    app: APP_NAME,
    version: '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (c) => {
  return c.json({ name: 'FillIt API', version: '0.1.0' });
});

// API routes
app.route('/api', analyzeRoutes);
app.route('/api', usageRoutes);

// Authenticated route: verify token and return user info
app.get('/api/auth/me', (c) => {
  return c.json({
    userId: c.get('userId'),
    provider: c.get('authProvider'),
  });
});

// Not found handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${c.req.method} ${c.req.path} not found`,
      },
    },
    404,
  );
});

export default app;
