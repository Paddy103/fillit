import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';

// Mock Claude service
const mockAnalyzeDocument = vi.fn();
vi.mock('../services/claude.js', () => ({
  getClaudeService: () => ({
    analyzeDocument: mockAnalyzeDocument,
    getUsage: () => ({ inputTokens: 500, outputTokens: 200, requests: 1 }),
  }),
}));

describe('POST /api/analyze', () => {
  let app: Hono<AppEnv>;

  beforeEach(async () => {
    mockAnalyzeDocument.mockReset();
    // Reset template cache between tests
    const { templateCache } = await import('../routes/analyze.js');
    templateCache.clear();

    app = new Hono<AppEnv>();
    // Simulate auth middleware
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user');
      c.set('authProvider', 'dev');
      await next();
    });
    const { analyzeRoutes } = await import('../routes/analyze.js');
    app.route('/api', analyzeRoutes);
    app.onError((err, c) => {
      const status = 'statusCode' in err ? (err as any).statusCode : 500;
      return c.json({ error: err.message }, status);
    });
  });

  function makeRequestBody() {
    return {
      pages: [
        {
          pageNumber: 1,
          imageBase64: 'dGVzdA==',
          ocrBlocks: [
            {
              text: 'First Name',
              bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.05 },
              confidence: 0.95,
            },
          ],
        },
      ],
      availableFields: ['firstName', 'lastName'],
    };
  }

  const analyzeResponse = {
    fields: [
      {
        id: 'field-1',
        pageNumber: 1,
        label: 'First Name',
        fieldType: 'text',
        bounds: { x: 0.1, y: 0.25, width: 0.3, height: 0.04 },
        matchedField: 'firstName',
        matchConfidence: 0.92,
      },
    ],
    documentType: 'employment form',
    documentLanguage: 'English',
  };

  it('should call Claude and return detected fields', async () => {
    mockAnalyzeDocument.mockResolvedValue(analyzeResponse);

    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeRequestBody()),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.fields).toHaveLength(1);
    expect(body.data.fields[0].label).toBe('First Name');
    expect(body.meta.cached).toBe(false);
    expect(body.meta.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should return cached result on second request with same layout', async () => {
    mockAnalyzeDocument.mockResolvedValue(analyzeResponse);

    // First request — cache miss
    await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeRequestBody()),
    });
    expect(mockAnalyzeDocument).toHaveBeenCalledOnce();

    // Second request — cache hit
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(makeRequestBody()),
    });

    expect(mockAnalyzeDocument).toHaveBeenCalledOnce(); // not called again
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.meta.cached).toBe(true);
  });

  it('should return 400 when pages is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableFields: ['firstName'] }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when pages is empty', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: [], availableFields: ['firstName'] }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when availableFields is missing', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: [{ pageNumber: 1, imageBase64: 'dGVzdA==', ocrBlocks: [] }],
      }),
    });

    expect(res.status).toBe(400);
  });

  it('should return 400 when page is missing imageBase64', async () => {
    const res = await app.request('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pages: [{ pageNumber: 1, ocrBlocks: [] }],
        availableFields: ['firstName'],
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/analyze/cache/stats', () => {
  it('should return cache statistics', async () => {
    const app = new Hono<AppEnv>();
    app.use('*', async (c, next) => {
      c.set('userId', 'test-user');
      c.set('authProvider', 'dev');
      await next();
    });
    const { analyzeRoutes } = await import('../routes/analyze.js');
    app.route('/api', analyzeRoutes);

    const res = await app.request('/api/analyze/cache/stats');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('size');
    expect(body.data).toHaveProperty('hits');
    expect(body.data).toHaveProperty('misses');
    expect(body.data).toHaveProperty('evictions');
  });
});
