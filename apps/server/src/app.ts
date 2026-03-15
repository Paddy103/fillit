import { Hono } from 'hono';
import { PACKAGE_NAME } from '@fillit/shared';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok', package: PACKAGE_NAME });
});

app.get('/', (c) => {
  return c.json({ name: 'FillIt API', version: '0.1.0' });
});

export default app;
