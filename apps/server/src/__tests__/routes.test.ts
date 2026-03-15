import { describe, expect, it } from 'vitest';
import app from '../app.js';

describe('GET /health', () => {
  it('should return 200', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('should return JSON with status ok', async () => {
    const res = await app.request('/health');
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('should include package name from @fillit/shared', async () => {
    const res = await app.request('/health');
    const body = await res.json();
    expect(body.package).toBe('@fillit/shared');
  });
});

describe('GET /', () => {
  it('should return 200', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });

  it('should return app name and version', async () => {
    const res = await app.request('/');
    const body = await res.json();
    expect(body.name).toBe('FillIt API');
    expect(body.version).toBe('0.1.0');
  });
});

describe('404 handling', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('should return 404 for wrong HTTP method', async () => {
    const res = await app.request('/health', { method: 'POST' });
    expect(res.status).toBe(404);
  });
});
