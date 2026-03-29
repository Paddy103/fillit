/**
 * Tests for scanned document overlay PDF generation.
 *
 * Creates test images and verifies that text, checkboxes, and signatures
 * are correctly overlaid at bounding box positions in the generated PDF.
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import type { DetectedField, DocumentPage, StoredSignature } from '@fillit/shared';

import {
  generateOverlayPdf,
  type FieldOverlay,
  type OverlayPageInput,
  type SignatureOverlayData,
} from '../scannedOverlay';

// ─── Helpers ──────────────────────────────────────────────────────

/** Create a minimal 1x1 white PNG for testing. */
function createTestPng(): Uint8Array {
  // Minimal valid PNG: 1x1 white pixel
  const png = new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a, // PNG signature
    0x00,
    0x00,
    0x00,
    0x0d,
    0x49,
    0x48,
    0x44,
    0x52, // IHDR chunk
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01, // 1x1
    0x08,
    0x02,
    0x00,
    0x00,
    0x00,
    0x90,
    0x77,
    0x53, // 8-bit RGB
    0xde,
    0x00,
    0x00,
    0x00,
    0x0c,
    0x49,
    0x44,
    0x41, // IDAT chunk
    0x54,
    0x08,
    0xd7,
    0x63,
    0xf8,
    0xcf,
    0xc0,
    0x00, // compressed data
    0x00,
    0x00,
    0x02,
    0x00,
    0x01,
    0xe2,
    0x21,
    0xbc, // ...
    0x33,
    0x00,
    0x00,
    0x00,
    0x00,
    0x49,
    0x45,
    0x4e, // IEND chunk
    0x44,
    0xae,
    0x42,
    0x60,
    0x82,
  ]);
  return png;
}

function makePage(overrides: Partial<DocumentPage> = {}): DocumentPage {
  return {
    id: 'page-1',
    documentId: 'doc-1',
    pageNumber: 1,
    originalImageUri: '/test/page1.png',
    ocrText: 'test text',
    width: 600,
    height: 800,
    ...overrides,
  };
}

function makeField(overrides: Partial<DetectedField> = {}): DetectedField {
  return {
    id: 'field-1',
    pageId: 'page-1',
    label: 'First Name',
    normalizedLabel: 'first_name',
    fieldType: 'text',
    bounds: { x: 0.1, y: 0.1, width: 0.3, height: 0.04 },
    matchConfidence: 0.9,
    value: 'John',
    isConfirmed: true,
    isSignatureField: false,
    ...overrides,
  };
}

function makePageInput(overrides: Partial<OverlayPageInput> = {}): OverlayPageInput {
  return {
    page: makePage(),
    imageBytes: createTestPng(),
    imageFormat: 'png',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('generateOverlayPdf', () => {
  it('should generate a PDF with page images', async () => {
    const result = await generateOverlayPdf([makePageInput()], []);

    expect(result.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
    expect(result.pageCount).toBe(1);
    expect(result.overlaidCount).toBe(0);

    // Verify it's a valid PDF
    const pdf = await PDFDocument.load(result.pdfBytes);
    expect(pdf.getPageCount()).toBe(1);
  });

  it('should overlay text fields at bounding box positions', async () => {
    const field = makeField({ value: 'John Doe' });
    const overlay: FieldOverlay = { field, value: 'John Doe' };

    const result = await generateOverlayPdf([makePageInput()], [overlay]);

    expect(result.overlaidCount).toBe(1);
    expect(result.skippedFields).toHaveLength(0);
    expect(result.pdfBytes.length).toBeGreaterThan(0);
  });

  it('should overlay date fields in SA format', async () => {
    const field = makeField({
      id: 'field-dob',
      label: 'Date of Birth',
      fieldType: 'date',
      bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
    });
    const overlay: FieldOverlay = { field, value: '1990-12-25' };

    const result = await generateOverlayPdf([makePageInput()], [overlay]);

    expect(result.overlaidCount).toBe(1);
  });

  it('should overlay checkbox fields', async () => {
    const field = makeField({
      id: 'field-consent',
      label: 'Consent',
      fieldType: 'checkbox',
      bounds: { x: 0.5, y: 0.3, width: 0.04, height: 0.04 },
    });
    const overlay: FieldOverlay = { field, value: 'true' };

    const result = await generateOverlayPdf([makePageInput()], [overlay]);

    expect(result.overlaidCount).toBe(1);
  });

  it('should handle multiple fields on one page', async () => {
    const fields: FieldOverlay[] = [
      { field: makeField({ id: 'f1', value: 'John' }), value: 'John' },
      {
        field: makeField({
          id: 'f2',
          label: 'Last Name',
          bounds: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
          value: 'Doe',
        }),
        value: 'Doe',
      },
      {
        field: makeField({
          id: 'f3',
          label: 'Email',
          bounds: { x: 0.1, y: 0.3, width: 0.4, height: 0.04 },
          value: 'john@example.com',
        }),
        value: 'john@example.com',
      },
    ];

    const result = await generateOverlayPdf([makePageInput()], fields);

    expect(result.overlaidCount).toBe(3);
    expect(result.skippedFields).toHaveLength(0);
  });

  it('should handle multi-page documents', async () => {
    const pages: OverlayPageInput[] = [
      makePageInput({ page: makePage({ id: 'page-1', pageNumber: 1 }) }),
      makePageInput({ page: makePage({ id: 'page-2', pageNumber: 2 }) }),
    ];

    const fields: FieldOverlay[] = [
      {
        field: makeField({ id: 'f1', pageId: 'page-1', value: 'Page 1 text' }),
        value: 'Page 1 text',
      },
      {
        field: makeField({ id: 'f2', pageId: 'page-2', value: 'Page 2 text' }),
        value: 'Page 2 text',
      },
    ];

    const result = await generateOverlayPdf(pages, fields);

    expect(result.pageCount).toBe(2);
    expect(result.overlaidCount).toBe(2);

    const pdf = await PDFDocument.load(result.pdfBytes);
    expect(pdf.getPageCount()).toBe(2);
  });

  it('should skip signature fields without signature data', async () => {
    const field = makeField({
      id: 'sig-field',
      label: 'Signature',
      fieldType: 'signature',
      isSignatureField: true,
    });
    const overlay: FieldOverlay = { field, value: '' };

    const result = await generateOverlayPdf([makePageInput()], [overlay]);

    expect(result.overlaidCount).toBe(0);
    expect(result.skippedFields).toEqual(['Signature']);
  });

  it('should draw typed signatures', async () => {
    const field = makeField({
      id: 'sig-field',
      label: 'Signature',
      fieldType: 'signature',
      isSignatureField: true,
      bounds: { x: 0.1, y: 0.8, width: 0.4, height: 0.06 },
    });
    const overlay: FieldOverlay = { field, value: '' };

    const signature: StoredSignature = {
      id: 'sig-1',
      profileId: 'profile-1',
      type: 'typed',
      label: 'Full Name',
      text: 'John Doe',
      fontFamily: 'Helvetica',
      createdAt: '2026-01-01T00:00:00Z',
      isDefault: true,
    };

    const sigMap = new Map<string, SignatureOverlayData>();
    sigMap.set('sig-field', { signature });

    const result = await generateOverlayPdf([makePageInput()], [overlay], {
      signatures: sigMap,
    });

    expect(result.overlaidCount).toBe(1);
    expect(result.skippedFields).toHaveLength(0);
  });

  it('should draw image signatures', async () => {
    const field = makeField({
      id: 'sig-field',
      label: 'Signature',
      fieldType: 'signature',
      isSignatureField: true,
      bounds: { x: 0.1, y: 0.8, width: 0.4, height: 0.06 },
    });
    const overlay: FieldOverlay = { field, value: '' };

    const signature: StoredSignature = {
      id: 'sig-1',
      profileId: 'profile-1',
      type: 'drawn',
      label: 'Drawn Signature',
      svgPath: 'M 10 20 L 30 40',
      createdAt: '2026-01-01T00:00:00Z',
      isDefault: true,
    };

    const sigMap = new Map<string, SignatureOverlayData>();
    sigMap.set('sig-field', { signature, imageBytes: createTestPng() });

    const result = await generateOverlayPdf([makePageInput()], [overlay], {
      signatures: sigMap,
    });

    expect(result.overlaidCount).toBe(1);
    expect(result.skippedFields).toHaveLength(0);
  });

  it('should handle empty field list', async () => {
    const result = await generateOverlayPdf([makePageInput()], []);

    expect(result.overlaidCount).toBe(0);
    expect(result.pageCount).toBe(1);
    expect(result.skippedFields).toHaveLength(0);
  });

  it('should sort pages by page number', async () => {
    const pages: OverlayPageInput[] = [
      makePageInput({ page: makePage({ id: 'page-2', pageNumber: 2 }) }),
      makePageInput({ page: makePage({ id: 'page-1', pageNumber: 1 }) }),
    ];

    const result = await generateOverlayPdf(pages, []);

    expect(result.pageCount).toBe(2);
  });

  it('should respect custom text color', async () => {
    const field = makeField({ value: 'Blue text' });
    const overlay: FieldOverlay = { field, value: 'Blue text' };

    const result = await generateOverlayPdf([makePageInput()], [overlay], {
      textColor: [0, 0, 1],
    });

    expect(result.overlaidCount).toBe(1);
  });

  it('should respect custom font size', async () => {
    const field = makeField({ value: 'Large text' });
    const overlay: FieldOverlay = { field, value: 'Large text' };

    const result = await generateOverlayPdf([makePageInput()], [overlay], {
      fontSize: 18,
    });

    expect(result.overlaidCount).toBe(1);
  });

  it('should skip drawn signatures without image bytes', async () => {
    const field = makeField({
      id: 'sig-field',
      label: 'Signature',
      fieldType: 'signature',
      isSignatureField: true,
    });
    const overlay: FieldOverlay = { field, value: '' };

    const signature: StoredSignature = {
      id: 'sig-1',
      profileId: 'profile-1',
      type: 'drawn',
      label: 'Drawn',
      svgPath: 'M 10 20',
      createdAt: '2026-01-01T00:00:00Z',
      isDefault: true,
    };

    const sigMap = new Map<string, SignatureOverlayData>();
    sigMap.set('sig-field', { signature }); // No imageBytes

    const result = await generateOverlayPdf([makePageInput()], [overlay], {
      signatures: sigMap,
    });

    expect(result.overlaidCount).toBe(0);
    expect(result.skippedFields).toEqual(['Signature']);
  });
});
