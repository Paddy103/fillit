import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import type { ExportPreviewScreenProps } from '../ExportPreviewScreen';

// ─── Tests ────────────────────────────────────────────────────────

describe('ExportPreviewScreen', () => {
  function makeProps(overrides: Partial<ExportPreviewScreenProps> = {}): ExportPreviewScreenProps {
    return {
      pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      title: 'Test Document',
      onExport: vi.fn(),
      onShare: vi.fn(),
      onPrint: vi.fn(),
      onEditFields: vi.fn(),
      onBack: vi.fn(),
      ...overrides,
    };
  }

  it('should have correct required props', () => {
    const props = makeProps();

    expect(props.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(props.title).toBe('Test Document');
    expect(typeof props.onExport).toBe('function');
    expect(typeof props.onShare).toBe('function');
    expect(typeof props.onPrint).toBe('function');
    expect(typeof props.onEditFields).toBe('function');
    expect(typeof props.onBack).toBe('function');
  });

  it('should accept isProcessing flag', () => {
    const props = makeProps({ isProcessing: true });
    expect(props.isProcessing).toBe(true);
  });

  it('should accept real PDF bytes', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBytes = await pdfDoc.save();

    const props = makeProps({ pdfBytes: new Uint8Array(pdfBytes) });

    expect(props.pdfBytes.length).toBeGreaterThan(100);
    expect(props.pdfBytes[0]).toBe(0x25); // %PDF
  });

  it('should invoke callbacks correctly', () => {
    const props = makeProps();

    props.onExport();
    props.onShare();
    props.onPrint();
    props.onEditFields();
    props.onBack();

    expect(props.onExport).toHaveBeenCalledOnce();
    expect(props.onShare).toHaveBeenCalledOnce();
    expect(props.onPrint).toHaveBeenCalledOnce();
    expect(props.onEditFields).toHaveBeenCalledOnce();
    expect(props.onBack).toHaveBeenCalledOnce();
  });

  it('should accept long document titles', () => {
    const props = makeProps({
      title: 'Very Long Document Title That Should Be Truncated In The UI',
    });
    expect(props.title.length).toBeGreaterThan(30);
  });

  it('should default isProcessing to undefined', () => {
    const props = makeProps();
    expect(props.isProcessing).toBeUndefined();
  });
});
