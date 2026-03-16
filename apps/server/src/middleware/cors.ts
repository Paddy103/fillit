import { cors as honoCors } from 'hono/cors';

const allowedOrigins = process.env['CORS_ORIGINS']
  ? process.env['CORS_ORIGINS'].split(',')
  : undefined;

export const cors = honoCors({
  origin: allowedOrigins ?? '*',
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
