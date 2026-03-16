import { Hono } from 'hono';
import { APP_NAME } from '@fillit/shared';
import type { AppEnv } from './types.js';
import { requestId, cors, logger, errorHandler } from './middleware/index.js';

const app = new Hono<AppEnv>();

// Middleware (order matters)
app.use('*', requestId);
app.use('*', cors);
app.use('*', logger);

// Error handler
app.onError(errorHandler);

// Routes
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
