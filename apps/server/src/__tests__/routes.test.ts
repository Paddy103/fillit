import { describe, it, expect, vi } from 'vitest';
import app from '../app.js';

describe('GET /health', () => {
  it('should return status ok with expected fields', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      app: string;
      version: string;
      uptime: number;
      timestamp: string;
    };
    expect(body.status).toBe('ok');
    expect(body.app).toBeTruthy();
    expect(body.version).toBe('0.1.0');
    expect(typeof body.uptime).toBe('number');
    expect(body.timestamp).toBeTruthy();
  });

  it('should include app name from @fillit/shared', async () => {
    const res = await app.request('/health');
    const body = (await res.json()) as { app: string };
    expect(body.app).toBe('FillIt');
  });

  it('should include X-Request-ID header', async () => {
    const res = await app.request('/health');
    expect(res.headers.get('X-Request-ID')).toBeTruthy();
  });
});

describe('GET /', () => {
  it('should return API info', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { name: string; version: string };
    expect(body.name).toBe('FillIt API');
    expect(body.version).toBe('0.1.0');
  });
});

describe('404 handler', () => {
  it('should return structured 404 JSON for unknown routes', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);

    const body = (await res.json()) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('/nonexistent');

    vi.restoreAllMocks();
  });

  it('should return 404 for wrong HTTP method', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await app.request('/health', { method: 'DELETE' });
    expect(res.status).toBe(404);

    const body = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');

    vi.restoreAllMocks();
  });
});
