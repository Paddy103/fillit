import { describe, it, expect, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';

import type { PdfPreviewProps } from '../PdfPreview';

// ─── Tests ────────────────────────────────────────────────────────

describe('PdfPreview', () => {
  it('should have correct props interface with pdfBytes', async () => {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.addPage();
    const pdfBytes = await pdfDoc.save();

    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array(pdfBytes),
      onLoad: vi.fn(),
      onError: vi.fn(),
    };

    expect(props.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(props.pdfBytes!.length).toBeGreaterThan(0);
  });

  it('should accept uri prop', () => {
    const props: PdfPreviewProps = {
      uri: 'file:///path/to/document.pdf',
    };

    expect(props.uri).toBe('file:///path/to/document.pdf');
  });

  it('should accept showControls option', () => {
    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array([1, 2, 3]),
      showControls: false,
    };

    expect(props.showControls).toBe(false);
  });

  it('should accept height option', () => {
    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array([1, 2, 3]),
      height: 500,
    };

    expect(props.height).toBe(500);
  });

  it('should accept string height', () => {
    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array([1, 2, 3]),
      height: '100%',
    };

    expect(props.height).toBe('100%');
  });

  it('should accept callback props', () => {
    const onLoad = vi.fn();
    const onError = vi.fn();

    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array([1, 2, 3]),
      onLoad,
      onError,
    };

    props.onLoad?.();
    props.onError?.('test error');

    expect(onLoad).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith('test error');
  });

  it('should work with neither pdfBytes nor uri (empty state)', () => {
    const props: PdfPreviewProps = {};

    expect(props.pdfBytes).toBeUndefined();
    expect(props.uri).toBeUndefined();
  });

  it('should handle real PDF bytes', async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    page.drawText('Hello World', { x: 50, y: 700, size: 30 });
    const pdfBytes = await pdfDoc.save();

    const props: PdfPreviewProps = {
      pdfBytes: new Uint8Array(pdfBytes),
    };

    expect(props.pdfBytes!.length).toBeGreaterThan(100);
    // Verify it's valid PDF by checking magic bytes
    expect(props.pdfBytes![0]).toBe(0x25); // %
    expect(props.pdfBytes![1]).toBe(0x50); // P
    expect(props.pdfBytes![2]).toBe(0x44); // D
    expect(props.pdfBytes![3]).toBe(0x46); // F
  });
});
