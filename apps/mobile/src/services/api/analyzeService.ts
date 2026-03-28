/**
 * Mobile client for the document analysis API.
 *
 * Wraps the backend POST /api/analyze endpoint with typed
 * request/response handling and the longer timeout needed
 * for image upload + Claude API processing.
 */

import type { DetectedFieldType } from '@fillit/shared';
import { ApiClient, type ApiRequestOptions } from './client.js';
import { ANALYZE_TIMEOUT_MS } from './config.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface AnalyzePageInput {
  pageNumber: number;
  imageBase64: string;
  ocrBlocks: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
    confidence: number;
  }>;
}

export interface AnalyzeRequestInput {
  pages: AnalyzePageInput[];
  availableFields: string[];
}

export interface AnalyzedField {
  id: string;
  pageNumber: number;
  label: string;
  fieldType: DetectedFieldType;
  bounds: { x: number; y: number; width: number; height: number };
  matchedField: string | null;
  matchConfidence: number;
  notes?: string;
}

export interface AnalyzeResponseData {
  fields: AnalyzedField[];
  documentType?: string;
  documentLanguage?: string;
}

export interface AnalyzeResult {
  success: boolean;
  data: AnalyzeResponseData;
  meta: {
    cached: boolean;
    fingerprint: string;
    boxCount: number;
    usage?: {
      inputTokens: number;
      outputTokens: number;
      requests: number;
    };
  };
}

// ─── Service ───────────────────────────────────────────────────────

/**
 * Submit document pages for AI field detection.
 *
 * Sends page images + OCR bounding boxes to the backend analyze
 * endpoint. The backend handles fingerprinting, cache lookup,
 * and Claude API calls.
 *
 * @param client - Authenticated API client instance.
 * @param input - Pages with images and OCR data, plus available profile fields.
 * @returns Detected fields with bounding boxes and confidence scores.
 */
export async function analyzeDocument(
  client: ApiClient,
  input: AnalyzeRequestInput,
): Promise<AnalyzeResult> {
  const options: ApiRequestOptions = {
    timeoutMs: ANALYZE_TIMEOUT_MS,
  };

  return client.post<AnalyzeResult>('/api/analyze', input, options);
}

/**
 * Get template cache statistics from the backend.
 */
export async function getCacheStats(
  client: ApiClient,
): Promise<{
  success: boolean;
  data: { size: number; hits: number; misses: number; evictions: number };
}> {
  return client.get('/api/analyze/cache/stats');
}
