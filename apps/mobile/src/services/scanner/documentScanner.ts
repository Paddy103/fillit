/**
 * Document Scanner Service
 *
 * Wraps @infinitered/react-native-mlkit-document-scanner to provide a
 * typed, result-oriented API for launching the native document scanner.
 * Handles auto-edge detection, perspective correction, and multi-page scanning.
 */

import {
  launchDocumentScannerAsync,
  ResultFormatOptions,
  ScannerModeOptions,
} from '@infinitered/react-native-mlkit-document-scanner';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Configuration for the document scanner. */
export interface ScanConfig {
  /** Maximum number of pages the user can scan in one session. @default 20 */
  pageLimit?: number;
  /** Whether the user can pick images from their gallery. @default true */
  galleryImportAllowed?: boolean;
}

/** Successful scan containing image URIs for each page. */
export interface ScanSuccess {
  /** File URIs of the scanned page images (JPEG). */
  pages: string[];
  /** Number of pages scanned. */
  pageCount: number;
}

/** Discriminated union representing all possible scan outcomes. */
export type ScanResult =
  | { status: 'success'; data: ScanSuccess }
  | { status: 'canceled' }
  | { status: 'error'; error: Error };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_PAGE_LIMIT = 20;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Launch the native ML Kit document scanner.
 *
 * Opens a fullscreen camera UI with automatic document edge detection and
 * perspective correction. Returns cropped, corrected JPEG images for each
 * scanned page.
 *
 * @param config - Optional scanner configuration overrides.
 * @returns A discriminated result: success with page URIs, canceled, or error.
 */
export async function scanDocument(config?: ScanConfig): Promise<ScanResult> {
  if (Platform.OS === 'web') {
    return {
      status: 'error',
      error: new Error('Document scanning is not supported on web'),
    };
  }

  try {
    const result = await launchDocumentScannerAsync({
      pageLimit: config?.pageLimit ?? DEFAULT_PAGE_LIMIT,
      galleryImportAllowed: config?.galleryImportAllowed ?? true,
      scannerMode: ScannerModeOptions.FULL,
      resultFormats: ResultFormatOptions.JPEG,
    });

    if (result.canceled) {
      return { status: 'canceled' };
    }

    const pages = result.pages ?? [];
    if (pages.length === 0) {
      return {
        status: 'error',
        error: new Error('Scanner returned no pages'),
      };
    }

    return {
      status: 'success',
      data: { pages, pageCount: pages.length },
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
