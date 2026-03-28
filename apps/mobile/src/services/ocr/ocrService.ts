/**
 * OCR Service (S-42)
 *
 * Wraps @infinitered/react-native-mlkit-text-recognition to provide
 * structured text extraction with bounding boxes and confidence scores.
 * Processes scanned document page images and returns hierarchical OCR
 * results (blocks → lines → elements) suitable for field detection.
 *
 * Platform support:
 * - iOS/Android: ML Kit on-device text recognition
 * - Web: Not supported (will be added in Phase 6 via tesseract.js)
 */

import { Platform } from 'react-native';

import type { BoundingBox } from '@fillit/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A recognized text element (word/number). */
export interface OcrElement {
  text: string;
  bounds: BoundingBox;
  languages: string[];
}

/** A recognized text line (row of elements). */
export interface OcrLine {
  text: string;
  bounds: BoundingBox;
  languages: string[];
  elements: OcrElement[];
}

/** A recognized text block (paragraph/group of lines). */
export interface OcrBlock {
  text: string;
  bounds: BoundingBox;
  confidence: number;
  languages: string[];
  lines: OcrLine[];
}

/** Full OCR result for a single page. */
export interface OcrPageResult {
  /** The full extracted text from the page. */
  text: string;
  /** Structured text blocks with bounding boxes. */
  blocks: OcrBlock[];
  /** Number of text blocks found. */
  blockCount: number;
  /** Processing time in milliseconds. */
  processingTimeMs: number;
}

/** Discriminated union for OCR outcomes. */
export type OcrResult =
  | { status: 'success'; data: OcrPageResult }
  | { status: 'error'; error: Error }
  | { status: 'no_text' };

/** Options for OCR processing. */
export interface OcrOptions {
  /** Language hints to improve recognition accuracy. Defaults to ['en', 'af']. */
  languageHints?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LANGUAGE_HINTS = ['en', 'af'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert ML Kit Rect (left/top/right/bottom) to BoundingBox (x/y/width/height).
 */
function rectToBoundingBox(rect: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}): BoundingBox {
  return {
    x: rect.left,
    y: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

/**
 * Estimate confidence for a block based on recognized languages.
 *
 * ML Kit text recognition doesn't directly expose per-block confidence scores.
 * We derive a heuristic: blocks with recognized languages matching our hints
 * get higher confidence, blocks with unknown languages get lower confidence.
 */
function estimateBlockConfidence(recognizedLanguages: string[], languageHints: string[]): number {
  if (recognizedLanguages.length === 0) {
    return 0.6; // No language detected — moderate confidence
  }

  const hintSet = new Set(languageHints);
  const matchCount = recognizedLanguages.filter((lang) => hintSet.has(lang)).length;

  if (matchCount > 0) {
    return 0.9; // Matches expected language — high confidence
  }

  return 0.7; // Recognized but unexpected language — moderate confidence
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform OCR on a page image using ML Kit text recognition.
 *
 * @param imageUri - The local file URI of the page image (JPEG/PNG).
 * @param options - Optional OCR configuration.
 * @returns A discriminated result: success with structured text, no_text, or error.
 */
export async function performOcr(imageUri: string, options?: OcrOptions): Promise<OcrResult> {
  if (Platform.OS === 'web') {
    return {
      status: 'error',
      error: new Error('OCR is not supported on web. Web OCR will be available in Phase 6.'),
    };
  }

  const languageHints = options?.languageHints ?? DEFAULT_LANGUAGE_HINTS;
  const startTime = Date.now();

  try {
    // Dynamic import to avoid bundling native module on web
    const { recognizeText } = await import('@infinitered/react-native-mlkit-text-recognition');

    const result = await recognizeText(imageUri);

    if (!result.text || result.text.trim().length === 0) {
      return { status: 'no_text' };
    }

    const blocks: OcrBlock[] = result.blocks.map((block) => ({
      text: block.text,
      bounds: rectToBoundingBox(block.frame),
      confidence: estimateBlockConfidence(block.recognizedLanguages, languageHints),
      languages: block.recognizedLanguages,
      lines: block.lines.map((line) => ({
        text: line.text,
        bounds: rectToBoundingBox(line.frame),
        languages: line.recognizedLanguages,
        elements: line.elements.map((element) => ({
          text: element.text,
          bounds: rectToBoundingBox(element.frame),
          languages: element.recognizedLanguages,
        })),
      })),
    }));

    const processingTimeMs = Date.now() - startTime;

    return {
      status: 'success',
      data: {
        text: result.text,
        blocks,
        blockCount: blocks.length,
        processingTimeMs,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Perform OCR on multiple page images sequentially.
 *
 * @param imageUris - Array of local file URIs.
 * @param options - Optional OCR configuration.
 * @param onProgress - Optional callback invoked after each page completes (0 to 1).
 * @returns Array of OCR results, one per page.
 */
export async function performOcrBatch(
  imageUris: string[],
  options?: OcrOptions,
  onProgress?: (progress: number) => void,
): Promise<OcrResult[]> {
  const results: OcrResult[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    const result = await performOcr(imageUris[i]!, options);
    results.push(result);
    onProgress?.((i + 1) / imageUris.length);
  }

  return results;
}

/**
 * Extract plain text from an OCR result.
 * Returns an empty string for error or no_text results.
 */
export function extractPlainText(result: OcrResult): string {
  if (result.status === 'success') {
    return result.data.text;
  }
  return '';
}

/**
 * Extract all blocks with their bounding boxes from an OCR result.
 * Returns an empty array for error or no_text results.
 */
export function extractBlocks(result: OcrResult): OcrBlock[] {
  if (result.status === 'success') {
    return result.data.blocks;
  }
  return [];
}
