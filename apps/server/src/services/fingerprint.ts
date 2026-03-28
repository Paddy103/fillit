/**
 * Document fingerprinting service.
 *
 * Generates a stable hash from a document's structural layout (bounding
 * box positions and page count) so that repeat scans of the same form
 * template produce the same fingerprint regardless of filled-in content.
 *
 * Used as a cache key in the template cache (S-52) to skip redundant
 * Claude API calls for known form templates.
 */

import { createHash } from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────────────

/** A bounding box from OCR data, with normalized 0-1 coordinates. */
export interface LayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** OCR layout data for a single page. */
export interface PageLayout {
  pageNumber: number;
  boxes: LayoutBox[];
}

/** Input for fingerprint generation. */
export interface FingerprintInput {
  /** Total number of pages in the document. */
  pageCount: number;
  /** Layout data per page. */
  pages: PageLayout[];
}

/** Result of fingerprint generation. */
export interface FingerprintResult {
  /** The hex-encoded SHA-256 fingerprint. */
  hash: string;
  /** Number of layout boxes included in the hash. */
  boxCount: number;
}

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Quantization grid size for bounding box coordinates.
 *
 * Coordinates are snapped to a grid of this many cells per axis.
 * A 50x50 grid means each cell is 2% of the page, which absorbs
 * minor scan alignment variations while distinguishing different
 * form layouts.
 */
const GRID_SIZE = 50;

// ─── Core ──────────────────────────────────────────────────────────

/**
 * Quantize a normalized coordinate (0-1) to a grid cell index.
 *
 * Clamps the value to [0, 1] before quantizing to handle slight
 * OCR overshoot at page edges.
 */
export function quantize(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  return Math.round(clamped * GRID_SIZE);
}

/**
 * Convert a bounding box to a quantized string token.
 *
 * Format: "x,y,w,h" where each value is a grid cell index.
 * This absorbs minor positional variations from scanning while
 * preserving the structural layout.
 */
export function boxToToken(box: LayoutBox): string {
  return `${quantize(box.x)},${quantize(box.y)},${quantize(box.width)},${quantize(box.height)}`;
}

/**
 * Generate a fingerprint for a document's structural layout.
 *
 * The fingerprint is based on:
 * 1. Total page count
 * 2. Quantized bounding box positions per page (sorted for stability)
 *
 * Text content is deliberately excluded — only the spatial layout
 * of fields matters. This means the same form template produces
 * the same fingerprint whether it's blank or filled in.
 */
export function generateFingerprint(input: FingerprintInput): FingerprintResult {
  const parts: string[] = [];
  let boxCount = 0;

  // Include page count as a top-level discriminator
  parts.push(`pages:${input.pageCount}`);

  // Process each page's layout
  for (const page of input.pages) {
    const tokens = page.boxes.map(boxToToken);
    // Sort tokens for position-independent stability
    tokens.sort();
    // Deduplicate identical tokens (overlapping OCR blocks)
    const unique = [...new Set(tokens)];

    parts.push(`p${page.pageNumber}:${unique.join('|')}`);
    boxCount += unique.length;
  }

  const payload = parts.join('\n');
  const hash = createHash('sha256').update(payload).digest('hex');

  return { hash, boxCount };
}

/**
 * Generate a fingerprint from raw OCR block data.
 *
 * Convenience wrapper that extracts bounding boxes from OCR blocks
 * matching the shape used in the Claude service.
 */
export function fingerprintFromOcrBlocks(
  pages: Array<{
    pageNumber: number;
    ocrBlocks: Array<{ bounds: LayoutBox }>;
  }>,
): FingerprintResult {
  return generateFingerprint({
    pageCount: pages.length,
    pages: pages.map((p) => ({
      pageNumber: p.pageNumber,
      boxes: p.ocrBlocks.map((b) => b.bounds),
    })),
  });
}
