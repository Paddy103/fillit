/**
 * ML Kit OCR Provider (iOS/Android)
 *
 * Uses @infinitered/react-native-mlkit-text-recognition for on-device
 * text recognition. Returns structured blocks with bounding boxes
 * and heuristic confidence scores.
 */

import type { BoundingBox } from '@fillit/shared';

import type { OcrBlock, OcrOptions, OcrProvider, OcrResult } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LANGUAGE_HINTS = ['en', 'af'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert ML Kit Rect (left/top/right/bottom) to BoundingBox (x/y/width/height). */
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
 * Estimate confidence based on recognized languages matching our hints.
 * ML Kit doesn't expose per-block confidence directly.
 */
function estimateBlockConfidence(recognizedLanguages: string[], languageHints: string[]): number {
  if (recognizedLanguages.length === 0) return 0.6;

  const hintSet = new Set(languageHints);
  const hasMatch = recognizedLanguages.some((lang) => hintSet.has(lang));
  return hasMatch ? 0.9 : 0.7;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const mlkitProvider: OcrProvider = {
  name: 'mlkit',

  async recognizePage(imageUri: string, options?: OcrOptions): Promise<OcrResult> {
    const languageHints = options?.languageHints ?? DEFAULT_LANGUAGE_HINTS;
    const startTime = Date.now();

    try {
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

      return {
        status: 'success',
        data: {
          text: result.text,
          blocks,
          blockCount: blocks.length,
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  },
};
