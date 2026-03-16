import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

export const logger = createMiddleware<AppEnv>(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const requestId = c.get('requestId');

  console.log(
    JSON.stringify({
      type: 'request',
      requestId,
      method,
      path,
      timestamp: new Date().toISOString(),
    }),
  );

  await next();

  const latency = Date.now() - start;
  console.log(
    JSON.stringify({
      type: 'response',
      requestId,
      method,
      path,
      status: c.res.status,
      latencyMs: latency,
    }),
  );
});
