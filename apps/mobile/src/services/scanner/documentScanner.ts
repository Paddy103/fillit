/**
 * Document Scanner Service
 *
 * Platform-aware document scanning:
 * - iOS: Uses react-native-document-scanner-plugin (Apple VisionKit)
 * - Android: Uses @infinitered/react-native-mlkit-document-scanner (Google ML Kit)
 *
 * Both provide auto-edge detection, perspective correction, and multi-page scanning.
 */

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
// Platform-specific scanners
// ---------------------------------------------------------------------------

/**
 * iOS scanner using react-native-document-scanner-plugin (Apple VisionKit).
 */
async function scanIOS(config?: ScanConfig): Promise<ScanResult> {
  try {
    const DocumentScanner = (await import('react-native-document-scanner-plugin')).default;

    const { scannedImages, status } = await DocumentScanner.scanDocument({
      maxNumDocuments: config?.pageLimit ?? DEFAULT_PAGE_LIMIT,
      croppedImageQuality: 100,
    });

    if (status === 'cancel') {
      return { status: 'canceled' };
    }

    const pages = scannedImages ?? [];
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

/**
 * Android scanner using @infinitered/react-native-mlkit-document-scanner (Google ML Kit).
 */
async function scanAndroid(config?: ScanConfig): Promise<ScanResult> {
  try {
    const { launchDocumentScannerAsync, ResultFormatOptions, ScannerModeOptions } =
      await import('@infinitered/react-native-mlkit-document-scanner');

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Launch the native document scanner.
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

  if (Platform.OS === 'ios') {
    return scanIOS(config);
  }

  return scanAndroid(config);
}
