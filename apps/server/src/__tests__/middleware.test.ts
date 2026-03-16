import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { requestId, cors, logger, errorHandler } from '../middleware/index.js';
import {
  AppError,
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors.js';

describe('Request ID middleware', () => {
  it('should add X-Request-ID header to response', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    const id = res.headers.get('X-Request-ID');
    expect(id).toBeTruthy();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should generate unique IDs per request', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.get('/test', (c) => c.json({ ok: true }));

    const res1 = await app.request('/test');
    const res2 = await app.request('/test');
    expect(res1.headers.get('X-Request-ID')).not.toBe(res2.headers.get('X-Request-ID'));
  });

  it('should set requestId on context', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.get('/test', (c) => {
      const id = c.get('requestId');
      return c.json({ requestId: id });
    });

    const res = await app.request('/test');
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('CORS middleware', () => {
  it('should add CORS headers to regular requests', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', cors);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  it('should handle preflight OPTIONS requests', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', cors);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('should allow credentials', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', cors);
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});

describe('Logger middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should not break the request flow', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.use('*', logger);
    app.get('/test', (c) => c.json({ ok: true }));

    vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('should log request and response', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.use('*', logger);
    app.get('/test', (c) => c.json({ ok: true }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await app.request('/test');

    expect(logSpy).toHaveBeenCalledTimes(2);
    const requestLog = JSON.parse(logSpy.mock.calls[0]![0] as string) as {
      type: string;
    };
    const responseLog = JSON.parse(logSpy.mock.calls[1]![0] as string) as {
      type: string;
    };
    expect(requestLog.type).toBe('request');
    expect(responseLog.type).toBe('response');
  });
});

describe('Error handler', () => {
  it('should return structured error for AppError', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid input');
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(422);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Invalid input');
  });

  it('should return 404 for NotFoundError', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new NotFoundError();
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(404);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('should return 400 for BadRequestError', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new BadRequestError('Missing field');
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('Missing field');
  });

  it('should return 401 for UnauthorizedError', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new UnauthorizedError();
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(401);
  });

  it('should return 403 for ForbiddenError', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new ForbiddenError();
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(403);
  });

  it('should return 500 for unknown errors without exposing details', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', requestId);
    app.onError(errorHandler);
    app.get('/test', () => {
      throw new Error('secret database password leaked');
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(body.error.message).toBe('An unexpected error occurred');
    expect(body.error.message).not.toContain('secret');
  });
});
