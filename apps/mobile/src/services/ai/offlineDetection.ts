/**
 * Offline field detection using local heuristics.
 *
 * Fallback when the device is offline or the API is unreachable.
 * Uses the label dictionary + fuzzy matching from @fillit/shared
 * to detect fields without Claude API calls.
 */

import { findBestMatch, type MatchResult, type DetectedFieldType } from '@fillit/shared';

// ─── Types ─────────────────────────────────────────────────────────

export interface OcrBlock {
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface OfflineDetectedField {
  id: string;
  pageNumber: number;
  label: string;
  fieldType: DetectedFieldType;
  bounds: { x: number; y: number; width: number; height: number };
  matchedField: string | null;
  matchConfidence: number;
  matchMethod: 'exact' | 'fuzzy' | 'none';
}

export interface OfflineDetectionResult {
  fields: OfflineDetectedField[];
  isOffline: true;
  reducedAccuracy: true;
}

// ─── Service ───────────────────────────────────────────────────────

/**
 * Run offline field detection on OCR blocks using local heuristics.
 *
 * For each OCR block, attempts to match the text against the label
 * dictionary (exact match) and falls back to fuzzy matching. Returns
 * detected fields with confidence scores.
 *
 * Accuracy is lower than Claude API — the result includes flags
 * to indicate this to the UI.
 */
export function detectFieldsOffline(
  pages: Array<{ pageNumber: number; ocrBlocks: OcrBlock[] }>,
): OfflineDetectionResult {
  const fields: OfflineDetectedField[] = [];
  let fieldIndex = 0;

  for (const page of pages) {
    for (const block of page.ocrBlocks) {
      // Skip low-confidence OCR blocks
      if (block.confidence < 0.5) continue;

      const match: MatchResult = findBestMatch(block.text);

      // Only include blocks that matched something
      if (match.matchMethod !== 'none') {
        fields.push({
          id: `offline-field-${fieldIndex++}`,
          pageNumber: page.pageNumber,
          label: block.text,
          fieldType: match.fieldType,
          bounds: block.bounds,
          matchedField: match.fieldPath || null,
          matchConfidence: match.confidence,
          matchMethod: match.matchMethod,
        });
      }
    }
  }

  return {
    fields,
    isOffline: true,
    reducedAccuracy: true,
  };
}
