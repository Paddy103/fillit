/**
 * OCR Service — Platform-aware abstraction (S-42 + S-43)
 *
 * Dispatches OCR operations to the appropriate provider based on platform:
 * - iOS/Android: ML Kit on-device text recognition
 * - Web: Tesseract.js (stub — Phase 6)
 *
 * All providers conform to the OcrProvider interface and return the same
 * consistent output format (OcrResult with blocks/lines/elements).
 */

import { Platform } from 'react-native';

import type { OcrBlock, OcrOptions, OcrProvider, OcrResult } from './types';
import { mlkitProvider } from './mlkitProvider';
import { webProvider } from './webProvider';

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

/**
 * Get the OCR provider for the current platform.
 */
function getProvider(): OcrProvider {
  if (Platform.OS === 'web') {
    return webProvider;
  }
  return mlkitProvider;
}

// ---------------------------------------------------------------------------
// Public API (backward-compatible with S-42)
// ---------------------------------------------------------------------------

/**
 * Perform OCR on a page image using the platform-appropriate provider.
 *
 * @param imageUri - The local file URI of the page image (JPEG/PNG).
 * @param options - Optional OCR configuration.
 * @returns A discriminated result: success with structured text, no_text, or error.
 */
export async function performOcr(imageUri: string, options?: OcrOptions): Promise<OcrResult> {
  const provider = getProvider();
  return provider.recognizePage(imageUri, options);
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
  const provider = getProvider();
  const results: OcrResult[] = [];

  for (let i = 0; i < imageUris.length; i++) {
    const result = await provider.recognizePage(imageUris[i]!, options);
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

/**
 * Get the name of the active OCR provider for the current platform.
 */
export function getActiveProviderName(): string {
  return getProvider().name;
}
