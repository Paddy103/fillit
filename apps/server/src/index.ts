import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { PACKAGE_NAME } from '@fillit/shared';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok', package: PACKAGE_NAME });
});

app.get('/', (c) => {
  return c.json({ name: 'FillIt API', version: '0.1.0' });
});

const port = Number(process.env['PORT']) || 3000;

serve({ fetch: app.fetch, port }, (info: { port: number }) => {
  console.log(`FillIt server running on http://localhost:${info.port}`);
});

export default app;
