/**
 * Document analysis route.
 *
 * POST /api/analyze — accepts document page images + OCR data,
 * checks the template cache by fingerprint, and falls back to
 * Claude API for uncached templates. Returns detected fields
 * with bounding boxes and confidence scores.
 */

import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { BadRequestError } from '../utils/errors.js';
import { getClaudeService, type AnalyzePage } from '../services/claude.js';
import { fingerprintFromOcrBlocks } from '../services/fingerprint.js';
import { TemplateCache } from '../services/template-cache.js';

// ─── Request Schema ────────────────────────────────────────────────

interface AnalyzeRequestBody {
  pages: Array<{
    pageNumber: number;
    imageBase64: string;
    ocrBlocks: Array<{
      text: string;
      bounds: { x: number; y: number; width: number; height: number };
      confidence: number;
    }>;
  }>;
  availableFields: string[];
}

// ─── Route ─────────────────────────────────────────────────────────

const templateCache = new TemplateCache();

const analyzeRoutes = new Hono<AppEnv>();

analyzeRoutes.post('/analyze', async (c) => {
  const body = await c.req.json<AnalyzeRequestBody>();

  // Validate request
  if (!body.pages || !Array.isArray(body.pages) || body.pages.length === 0) {
    throw new BadRequestError('Request must include at least one page');
  }
  if (!body.availableFields || !Array.isArray(body.availableFields)) {
    throw new BadRequestError('Request must include availableFields array');
  }

  // Validate individual pages
  for (const page of body.pages) {
    if (!page.imageBase64 || typeof page.imageBase64 !== 'string') {
      throw new BadRequestError(`Page ${page.pageNumber}: imageBase64 is required`);
    }
    if (!Array.isArray(page.ocrBlocks)) {
      throw new BadRequestError(`Page ${page.pageNumber}: ocrBlocks must be an array`);
    }
  }

  // Generate fingerprint for cache lookup
  const fingerprint = fingerprintFromOcrBlocks(body.pages);

  // Check template cache
  const cached = templateCache.get(fingerprint.hash);
  if (cached) {
    return c.json({
      success: true,
      data: cached,
      meta: {
        cached: true,
        fingerprint: fingerprint.hash,
        boxCount: fingerprint.boxCount,
      },
    });
  }

  // Call Claude API
  const claude = getClaudeService();
  const pages: AnalyzePage[] = body.pages.map((p) => ({
    pageNumber: p.pageNumber,
    imageBase64: p.imageBase64,
    ocrBlocks: p.ocrBlocks,
  }));

  const result = await claude.analyzeDocument({
    pages,
    availableFields: body.availableFields,
  });

  // Cache the result
  templateCache.set(fingerprint.hash, result);

  return c.json({
    success: true,
    data: result,
    meta: {
      cached: false,
      fingerprint: fingerprint.hash,
      boxCount: fingerprint.boxCount,
      usage: claude.getUsage(),
    },
  });
});

// Cache stats endpoint
analyzeRoutes.get('/analyze/cache/stats', (c) => {
  return c.json({
    success: true,
    data: templateCache.getStats(),
  });
});

export { analyzeRoutes, templateCache };
