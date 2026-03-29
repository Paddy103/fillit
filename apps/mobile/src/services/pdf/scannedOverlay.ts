/**
 * PDF generation for scanned document overlay.
 *
 * Creates a PDF from scanned page images and draws text/signature
 * overlays at detected field bounding box positions. Used for
 * non-AcroForm documents where fields are detected by AI on scanned images.
 */

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { BoundingBox, DetectedField, DocumentPage, StoredSignature } from '@fillit/shared';

import { formatDateSA } from './formFill';

// ─── Types ─────────────────────────────────────────────────────────

/** A page with its image bytes for embedding into the PDF. */
export interface OverlayPageInput {
  /** The document page metadata. */
  page: DocumentPage;
  /** The page image as a JPEG or PNG byte array. */
  imageBytes: Uint8Array;
  /** Image format. */
  imageFormat: 'jpeg' | 'png';
}

/** A field overlay to draw on the PDF. */
export interface FieldOverlay {
  /** The detected field to overlay. */
  field: DetectedField;
  /** The value to display. For signatures, this is ignored — use signatureData instead. */
  value: string;
}

/** Signature data to draw at a signature field. */
export interface SignatureOverlayData {
  /** The signature to render. */
  signature: StoredSignature;
  /** SVG path rendered as PNG bytes (for drawn signatures). */
  imageBytes?: Uint8Array;
}

/** Options for the overlay generation. */
export interface OverlayOptions {
  /** Font size for text fields in points. @default 12 */
  fontSize?: number;
  /** Text color as [r, g, b] in 0–1 range. @default [0, 0, 0] (black) */
  textColor?: [number, number, number];
  /** Signature data keyed by field ID. */
  signatures?: Map<string, SignatureOverlayData>;
}

/** Result of the overlay generation. */
export interface OverlayResult {
  /** The generated PDF as a Uint8Array. */
  pdfBytes: Uint8Array;
  /** Number of pages in the PDF. */
  pageCount: number;
  /** Number of fields overlaid. */
  overlaidCount: number;
  /** Fields that could not be overlaid (e.g., missing signature data). */
  skippedFields: string[];
}

// ─── Constants ────────────────────────────────────────────────────

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_TEXT_COLOR: [number, number, number] = [0, 0, 0];
const SIGNATURE_FONT_SIZE = 24;

// ─── Service ──────────────────────────────────────────────────────

/**
 * Generate a PDF from scanned pages with field value overlays.
 *
 * 1. Creates a new PDF document
 * 2. Embeds each page image as a full-page background
 * 3. Draws text values at bounding box positions for text/date/number fields
 * 4. Draws checkmarks for checkbox fields
 * 5. Draws signature images or typed text for signature fields
 *
 * Bounding box coordinates are normalized (0–1) relative to page dimensions.
 */
export async function generateOverlayPdf(
  pages: OverlayPageInput[],
  fields: FieldOverlay[],
  options: OverlayOptions = {},
): Promise<OverlayResult> {
  const fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
  const textColor = options.textColor ?? DEFAULT_TEXT_COLOR;
  const signatures = options.signatures ?? new Map<string, SignatureOverlayData>();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Sort pages by page number
  const sortedPages = [...pages].sort((a, b) => a.page.pageNumber - b.page.pageNumber);

  // Embed all page images and create PDF pages
  const pdfPages: Array<{ pdfPage: PDFPage; pageId: string }> = [];

  for (const pageInput of sortedPages) {
    const { pdfPage, width, height } = await embedPageImage(pdfDoc, pageInput);
    pdfPages.push({ pdfPage, pageId: pageInput.page.id });

    // Store dimensions for bounding box conversion
    pdfPage.setSize(width, height);
  }

  // Group fields by page
  const fieldsByPage = new Map<string, FieldOverlay[]>();
  for (const fo of fields) {
    const pageId = fo.field.pageId;
    const existing = fieldsByPage.get(pageId) ?? [];
    existing.push(fo);
    fieldsByPage.set(pageId, existing);
  }

  let overlaidCount = 0;
  const skippedFields: string[] = [];

  // Draw field overlays on each page
  for (const { pdfPage, pageId } of pdfPages) {
    const pageFields = fieldsByPage.get(pageId) ?? [];
    const pageWidth = pdfPage.getWidth();
    const pageHeight = pdfPage.getHeight();

    for (const fo of pageFields) {
      const { field } = fo;
      const absBox = toAbsoluteBox(field.bounds, pageWidth, pageHeight);

      if (field.isSignatureField) {
        const sigData = signatures.get(field.id);
        if (sigData) {
          const drawn = await drawSignature(pdfDoc, pdfPage, absBox, sigData, boldFont, textColor);
          if (drawn) {
            overlaidCount++;
          } else {
            skippedFields.push(field.label);
          }
        } else {
          skippedFields.push(field.label);
        }
      } else {
        drawFieldValue(pdfPage, absBox, fo, font, fontSize, textColor);
        overlaidCount++;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();

  return {
    pdfBytes,
    pageCount: pdfPages.length,
    overlaidCount,
    skippedFields,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

interface AbsoluteBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert normalized (0–1) bounding box to absolute PDF coordinates.
 * PDF coordinates have origin at bottom-left, so we flip the y-axis.
 */
function toAbsoluteBox(bounds: BoundingBox, pageWidth: number, pageHeight: number): AbsoluteBox {
  return {
    x: bounds.x * pageWidth,
    // PDF y=0 is bottom. bounds.y is from top.
    y: pageHeight - (bounds.y + bounds.height) * pageHeight,
    width: bounds.width * pageWidth,
    height: bounds.height * pageHeight,
  };
}

/**
 * Embed a page image into the PDF and return the page + dimensions.
 */
async function embedPageImage(
  pdfDoc: PDFDocument,
  pageInput: OverlayPageInput,
): Promise<{ pdfPage: PDFPage; width: number; height: number }> {
  const { page, imageBytes, imageFormat } = pageInput;

  const image =
    imageFormat === 'png' ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

  // Use the original page dimensions or fall back to image dimensions
  const width = page.width || image.width;
  const height = page.height || image.height;

  const pdfPage = pdfDoc.addPage([width, height]);

  // Draw the image as a full-page background
  pdfPage.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });

  return { pdfPage, width, height };
}

/**
 * Draw a text/date/number/checkbox field value on the page.
 */
function drawFieldValue(
  page: PDFPage,
  box: AbsoluteBox,
  overlay: FieldOverlay,
  font: PDFFont,
  fontSize: number,
  textColor: [number, number, number],
): void {
  const { field } = overlay;
  const value = overlay.value;

  if (!value) return;

  if (field.fieldType === 'checkbox') {
    drawCheckbox(page, box, value, font, textColor);
    return;
  }

  const displayValue = field.fieldType === 'date' ? formatDateSA(value) : value;

  // Auto-size font to fit within the bounding box width
  const effectiveSize = fitFontSize(font, displayValue, box.width, box.height, fontSize);

  page.drawText(displayValue, {
    x: box.x + 2,
    y: box.y + (box.height - effectiveSize) / 2,
    size: effectiveSize,
    font,
    color: rgb(textColor[0], textColor[1], textColor[2]),
    maxWidth: box.width - 4,
  });
}

/**
 * Draw a checkmark for a checkbox field.
 */
function drawCheckbox(
  page: PDFPage,
  box: AbsoluteBox,
  value: string,
  font: PDFFont,
  textColor: [number, number, number],
): void {
  const isChecked = ['true', 'yes', '1', 'on', 'checked', 'x'].includes(value.toLowerCase().trim());

  if (!isChecked) return;

  const checkSize = Math.min(box.width, box.height) * 0.8;
  page.drawText('X', {
    x: box.x + (box.width - checkSize) / 2,
    y: box.y + (box.height - checkSize) / 2,
    size: checkSize,
    font,
    color: rgb(textColor[0], textColor[1], textColor[2]),
  });
}

/**
 * Draw a signature at the given bounding box.
 * Supports both drawn (image) and typed (text) signatures.
 */
async function drawSignature(
  pdfDoc: PDFDocument,
  page: PDFPage,
  box: AbsoluteBox,
  sigData: SignatureOverlayData,
  font: PDFFont,
  textColor: [number, number, number],
): Promise<boolean> {
  const { signature } = sigData;

  if (signature.type === 'drawn' && sigData.imageBytes) {
    // Embed the signature image
    const sigImage = await pdfDoc.embedPng(sigData.imageBytes);
    const aspectRatio = sigImage.width / sigImage.height;

    let drawWidth = box.width;
    let drawHeight = box.width / aspectRatio;

    if (drawHeight > box.height) {
      drawHeight = box.height;
      drawWidth = box.height * aspectRatio;
    }

    page.drawImage(sigImage, {
      x: box.x + (box.width - drawWidth) / 2,
      y: box.y + (box.height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });

    return true;
  }

  if (signature.type === 'typed' && signature.text) {
    // Draw the typed signature text
    const sigSize = fitFontSize(font, signature.text, box.width, box.height, SIGNATURE_FONT_SIZE);

    page.drawText(signature.text, {
      x: box.x + 2,
      y: box.y + (box.height - sigSize) / 2,
      size: sigSize,
      font,
      color: rgb(textColor[0], textColor[1], textColor[2]),
      maxWidth: box.width - 4,
    });

    return true;
  }

  return false;
}

/**
 * Calculate the largest font size that fits the text within the given dimensions.
 */
function fitFontSize(
  font: PDFFont,
  text: string,
  maxWidth: number,
  maxHeight: number,
  preferredSize: number,
): number {
  let size = preferredSize;
  const minSize = 6;

  while (size > minSize) {
    const textWidth = font.widthOfTextAtSize(text, size);
    if (textWidth <= maxWidth - 4 && size <= maxHeight) {
      return size;
    }
    size -= 0.5;
  }

  return minSize;
}
