/**
 * Network-aware AI routing service.
 *
 * Routes document analysis to the cloud API when online or to
 * local heuristic matching when offline. Provides a unified
 * interface regardless of the detection method used.
 */

import type { DetectedFieldType } from '@fillit/shared';
import { ApiClient } from '../api/client.js';
import { analyzeDocument, type AnalyzeRequestInput } from '../api/analyzeService.js';
import { isOnline } from './networkStatus.js';
import { detectFieldsOffline, type OcrBlock } from './offlineDetection.js';

// ─── Types ─────────────────────────────────────────────────────────

export type DetectionMethod = 'cloud' | 'offline';

export interface DetectedFieldResult {
  id: string;
  pageNumber: number;
  label: string;
  fieldType: DetectedFieldType;
  bounds: { x: number; y: number; width: number; height: number };
  matchedField: string | null;
  matchConfidence: number;
}

export interface DetectionResult {
  fields: DetectedFieldResult[];
  method: DetectionMethod;
  /** Whether accuracy is reduced (offline mode). */
  reducedAccuracy: boolean;
  /** Document fingerprint (cloud only). */
  fingerprint?: string;
  /** Whether the result was served from cache (cloud only). */
  cached?: boolean;
}

export interface AiRouterConfig {
  /** API client for cloud requests. */
  client: ApiClient;
  /** Available profile field names for matching. */
  availableFields: string[];
  /** Force a specific method (for testing). */
  forceMethod?: DetectionMethod;
}

// ─── Service ───────────────────────────────────────────────────────

/**
 * Analyze document pages using the best available method.
 *
 * 1. Checks network connectivity
 * 2. If online → calls cloud API (Claude + fingerprint cache)
 * 3. If offline → runs local heuristic matching (fuzzy + dictionary)
 * 4. Returns unified result with method indicator
 *
 * The caller can show a reduced-accuracy indicator when offline
 * results are returned.
 */
export async function detectFields(
  config: AiRouterConfig,
  pages: Array<{
    pageNumber: number;
    imageBase64: string;
    ocrBlocks: OcrBlock[];
  }>,
): Promise<DetectionResult> {
  const method = config.forceMethod ?? (await chooseMethod());

  if (method === 'cloud') {
    return detectViaCloud(config, pages);
  }

  return detectLocally(pages);
}

// ─── Private ───────────────────────────────────────────────────────

async function chooseMethod(): Promise<DetectionMethod> {
  try {
    const online = await isOnline();
    return online ? 'cloud' : 'offline';
  } catch {
    // Network check failed — assume offline
    return 'offline';
  }
}

async function detectViaCloud(
  config: AiRouterConfig,
  pages: Array<{
    pageNumber: number;
    imageBase64: string;
    ocrBlocks: OcrBlock[];
  }>,
): Promise<DetectionResult> {
  try {
    const input: AnalyzeRequestInput = {
      pages: pages.map((p) => ({
        pageNumber: p.pageNumber,
        imageBase64: p.imageBase64,
        ocrBlocks: p.ocrBlocks,
      })),
      availableFields: config.availableFields,
    };

    const response = await analyzeDocument(config.client, input);

    return {
      fields: response.data.fields.map((f) => ({
        id: f.id,
        pageNumber: f.pageNumber,
        label: f.label,
        fieldType: f.fieldType,
        bounds: f.bounds,
        matchedField: f.matchedField,
        matchConfidence: f.matchConfidence,
      })),
      method: 'cloud',
      reducedAccuracy: false,
      fingerprint: response.meta.fingerprint,
      cached: response.meta.cached,
    };
  } catch {
    // Cloud failed — fall back to offline
    return detectLocally(pages);
  }
}

function detectLocally(
  pages: Array<{
    pageNumber: number;
    ocrBlocks: OcrBlock[];
  }>,
): DetectionResult {
  const result = detectFieldsOffline(pages);

  return {
    fields: result.fields.map((f) => ({
      id: f.id,
      pageNumber: f.pageNumber,
      label: f.label,
      fieldType: f.fieldType,
      bounds: f.bounds,
      matchedField: f.matchedField,
      matchConfidence: f.matchConfidence,
    })),
    method: 'offline',
    reducedAccuracy: true,
  };
}
