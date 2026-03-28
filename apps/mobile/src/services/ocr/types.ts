/**
 * OCR type definitions shared across all platform providers.
 *
 * These types define the consistent output format that both the ML Kit
 * (native) and Tesseract.js (web) providers must conform to.
 */

import type { BoundingBox } from '@fillit/shared';

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

/**
 * Platform-agnostic OCR provider interface.
 *
 * Each platform (native/web) implements this interface to provide
 * consistent OCR capabilities regardless of the underlying engine.
 */
export interface OcrProvider {
  /** Human-readable name for logging/debugging. */
  readonly name: string;
  /** Perform OCR on a single page image. */
  recognizePage(imageUri: string, options?: OcrOptions): Promise<OcrResult>;
}
