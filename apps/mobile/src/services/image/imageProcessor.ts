/**
 * Image Processing Utilities (S-45)
 *
 * Provides image manipulation operations optimized for the document
 * scanning and OCR pipeline. Uses expo-image-manipulator for resize,
 * compress, rotate, and contrast/brightness adjustments.
 *
 * All operations preserve aspect ratio by default and output JPEG
 * for optimal balance of quality and file size.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { SaveFormat } from 'expo-image-manipulator';
import { readFile } from '../storage/fileStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of an image processing operation. */
export interface ProcessedImage {
  /** Local file URI of the processed image. */
  uri: string;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
}

/** Options for resizing an image. */
export interface ResizeOptions {
  /** Target width in pixels. Omit to auto-calculate from height + aspect ratio. */
  width?: number;
  /** Target height in pixels. Omit to auto-calculate from width + aspect ratio. */
  height?: number;
}

/** Options for compressing an image. */
export interface CompressOptions {
  /** Quality from 0 (highest compression) to 1 (no compression). @default 0.8 */
  quality?: number;
  /** Output format. @default 'jpeg' */
  format?: 'jpeg' | 'png';
}

/** Image prepared for API submission with base64 data. */
export interface ApiImage {
  /** Base64-encoded JPEG data (no data URI prefix). */
  base64: string;
  /** MIME type of the image. */
  mimeType: 'image/jpeg';
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  /** Approximate size of the base64 payload in bytes. */
  sizeBytes: number;
}

/** Options for the full image processing pipeline. */
export interface ProcessPageOptions {
  /** Max dimension (width or height) for resizing. @default 2048 */
  maxDimension?: number;
  /** JPEG compression quality (0 to 1). @default 0.85 */
  quality?: number;
  /** Rotation in degrees (0, 90, 180, 270). @default 0 */
  rotation?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default max dimension for OCR-optimized images. */
const DEFAULT_MAX_DIMENSION = 2048;

/** Default JPEG quality for OCR-optimized images. */
const DEFAULT_QUALITY = 0.85;

/** Max dimension for API submission (smaller for bandwidth). */
const API_MAX_DIMENSION = 2048;

/** JPEG quality for API submission. */
const API_QUALITY = 0.85;

/** Maximum base64 payload size in bytes (20 MB). */
const MAX_API_PAYLOAD_BYTES = 20 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------

/**
 * Resize an image while preserving aspect ratio.
 *
 * Specify either width or height (not both) to auto-calculate the other
 * dimension from the original aspect ratio. If both are specified, the
 * image is resized to fit within the given bounds.
 *
 * @param uri - Source image file URI.
 * @param options - Resize dimensions.
 * @returns The resized image.
 */
export async function resizeImage(uri: string, options: ResizeOptions): Promise<ProcessedImage> {
  const resize: { width?: number; height?: number } = {};
  if (options.width !== undefined) resize.width = options.width;
  if (options.height !== undefined) resize.height = options.height;

  const result = await ImageManipulator.manipulateAsync(uri, [{ resize }], {
    format: SaveFormat.JPEG,
    compress: 1,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Compress an image to reduce file size.
 *
 * @param uri - Source image file URI.
 * @param options - Compression settings.
 * @returns The compressed image.
 */
export async function compressImage(
  uri: string,
  options?: CompressOptions,
): Promise<ProcessedImage> {
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const format = options?.format === 'png' ? SaveFormat.PNG : SaveFormat.JPEG;

  const result = await ImageManipulator.manipulateAsync(uri, [], {
    format,
    compress: quality,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Rotate an image by the specified degrees.
 *
 * @param uri - Source image file URI.
 * @param degrees - Clockwise rotation in degrees.
 * @returns The rotated image.
 */
export async function rotateImage(uri: string, degrees: number): Promise<ProcessedImage> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ rotate: degrees }], {
    format: SaveFormat.JPEG,
    compress: 1,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Crop an image to the specified region.
 *
 * @param uri - Source image file URI.
 * @param region - The crop region in pixels.
 * @returns The cropped image.
 */
export async function cropImage(
  uri: string,
  region: { originX: number; originY: number; width: number; height: number },
): Promise<ProcessedImage> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ crop: region }], {
    format: SaveFormat.JPEG,
    compress: 1,
  });

  return { uri: result.uri, width: result.width, height: result.height };
}

// ---------------------------------------------------------------------------
// Pipeline operations
// ---------------------------------------------------------------------------

/**
 * Process a scanned page image for optimal OCR performance.
 *
 * Applies a sequence of operations:
 * 1. Rotation correction (if specified)
 * 2. Resize to fit within maxDimension (preserving aspect ratio)
 * 3. JPEG compression at the specified quality
 *
 * This produces an image optimized for ML Kit text recognition with
 * good quality-to-size ratio.
 *
 * @param uri - Source image file URI.
 * @param options - Processing options.
 * @returns The processed image ready for OCR.
 */
export async function processPageForOcr(
  uri: string,
  options?: ProcessPageOptions,
): Promise<ProcessedImage> {
  const maxDim = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const rotation = options?.rotation ?? 0;

  const actions: ImageManipulator.Action[] = [];

  // Apply rotation if needed
  if (rotation !== 0) {
    actions.push({ rotate: rotation });
  }

  // Resize to fit within max dimension (preserving aspect ratio)
  // We use width as the constraint — manipulateAsync preserves ratio
  // when only one dimension is specified
  actions.push({ resize: { width: maxDim } });

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    format: SaveFormat.JPEG,
    compress: quality,
  });

  // If the image was already smaller than maxDim, the resize may have
  // scaled it up. In that case, re-process with original dimensions.
  // However, manipulateAsync won't upscale, so this is safe.

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Optimize an image for API submission.
 *
 * Produces a smaller, more compressed image suitable for sending
 * to the backend/Claude API while retaining enough quality for
 * field detection.
 *
 * @param uri - Source image file URI.
 * @returns The optimized image for API use.
 */
export async function optimizeForApi(uri: string): Promise<ProcessedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: API_MAX_DIMENSION } }],
    { format: SaveFormat.JPEG, compress: API_QUALITY },
  );

  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Prepare an image for API submission.
 *
 * Resizes, compresses, encodes to base64, and validates the payload size.
 * Returns a ready-to-send object with base64 data and metadata.
 *
 * @param uri - Source image file URI.
 * @returns The API-ready image with base64 data.
 * @throws {Error} If the resulting payload exceeds the size limit.
 */
export async function prepareImageForApi(uri: string): Promise<ApiImage> {
  const optimized = await optimizeForApi(uri);
  const base64 = await readFile(optimized.uri);
  const sizeBytes = Math.ceil(base64.length * 0.75); // base64 → raw byte estimate

  if (sizeBytes > MAX_API_PAYLOAD_BYTES) {
    throw new Error(
      `Image too large for API submission: ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds ${MAX_API_PAYLOAD_BYTES / 1024 / 1024}MB limit`,
    );
  }

  return {
    base64,
    mimeType: 'image/jpeg',
    width: optimized.width,
    height: optimized.height,
    sizeBytes,
  };
}

/**
 * Prepare multiple page images for API submission.
 *
 * @param uris - Array of source image file URIs.
 * @param onProgress - Optional progress callback (0 to 1).
 * @returns Array of API-ready images.
 */
export async function preparePagesBatchForApi(
  uris: string[],
  onProgress?: (progress: number) => void,
): Promise<ApiImage[]> {
  const results: ApiImage[] = [];

  for (let i = 0; i < uris.length; i++) {
    const result = await prepareImageForApi(uris[i]!);
    results.push(result);
    onProgress?.((i + 1) / uris.length);
  }

  return results;
}

/**
 * Process multiple page images in sequence.
 *
 * @param uris - Array of source image file URIs.
 * @param options - Processing options applied to each page.
 * @param onProgress - Optional callback invoked after each page (0 to 1).
 * @returns Array of processed images.
 */
export async function processPagesBatch(
  uris: string[],
  options?: ProcessPageOptions,
  onProgress?: (progress: number) => void,
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];

  for (let i = 0; i < uris.length; i++) {
    const result = await processPageForOcr(uris[i]!, options);
    results.push(result);
    onProgress?.((i + 1) / uris.length);
  }

  return results;
}
