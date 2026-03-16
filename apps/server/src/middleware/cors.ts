import { cors as honoCors } from 'hono/cors';

const allowedOrigins = process.env['CORS_ORIGINS']
  ? process.env['CORS_ORIGINS'].split(',')
  : undefined;

export const cors = honoCors({
  origin: allowedOrigins ?? '*',
  // credentials: true requires specific origins — browsers reject it with origin: '*'
  credentials: !!allowedOrigins,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});
