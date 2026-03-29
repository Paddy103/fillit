/**
 * Tests for PDF export actions (save, share, print).
 *
 * Mocks expo-file-system, expo-sharing, and expo-print to verify
 * the service logic without native module dependencies.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockFileWrite = vi.fn();
const mockFileDelete = vi.fn();
const mockFileCreate = vi.fn();

vi.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    exists = false;
    write = mockFileWrite;
    delete = mockFileDelete;
    create = mockFileCreate;

    constructor(base: string | MockFile, name?: string) {
      const baseUri = typeof base === 'string' ? base : base.uri;
      this.uri = name ? `${baseUri}/${name}` : baseUri;
    }
  }

  return {
    File: MockFile,
    Directory: MockFile,
    Paths: {
      cache: 'file:///cache',
      document: 'file:///documents',
    },
  };
});

const mockShareAsync = vi.fn();
const mockIsAvailableAsync = vi.fn();

vi.mock('expo-sharing', () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
  isAvailableAsync: () => mockIsAvailableAsync(),
}));

const mockPrintAsync = vi.fn();

vi.mock('expo-print', () => ({
  printAsync: (...args: unknown[]) => mockPrintAsync(...args),
}));

import { savePdf, sharePdf, printPdf, type ExportActionsConfig } from '../exportActions';

// ─── Helpers ──────────────────────────────────────────────────────

function makeConfig(overrides: Partial<ExportActionsConfig> = {}): ExportActionsConfig {
  return {
    pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
    title: 'Test Document',
    documentId: 'doc-123',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('savePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should save PDF and return result', async () => {
    const result = await savePdf(makeConfig());

    expect(result.uri).toBeDefined();
    expect(result.filename).toBe('Test_Document.pdf');
    expect(mockFileWrite).toHaveBeenCalledOnce();
  });

  it('should sanitize filename from title', async () => {
    const result = await savePdf(makeConfig({ title: 'My Doc: Special & Chars!' }));

    expect(result.filename).toBe('My_Doc_Special_Chars.pdf');
  });

  it('should fallback to "document" for empty title', async () => {
    const result = await savePdf(makeConfig({ title: '' }));

    expect(result.filename).toBe('document.pdf');
  });

  it('should truncate long filenames', async () => {
    const longTitle = 'A'.repeat(200);
    const result = await savePdf(makeConfig({ title: longTitle }));

    // 100 chars + .pdf
    expect(result.filename.length).toBeLessThanOrEqual(104);
  });
});

describe('sharePdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should share PDF via system share sheet', async () => {
    mockIsAvailableAsync.mockResolvedValue(true);

    await sharePdf(makeConfig());

    expect(mockShareAsync).toHaveBeenCalledOnce();
    expect(mockShareAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        mimeType: 'application/pdf',
        dialogTitle: 'Share Test Document',
        UTI: 'com.adobe.pdf',
      }),
    );
  });

  it('should throw when sharing is not available', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);

    await expect(sharePdf(makeConfig())).rejects.toThrow('Sharing is not available');
  });
});

describe('printPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should print PDF via system print dialog', async () => {
    await printPdf(makeConfig());

    expect(mockPrintAsync).toHaveBeenCalledOnce();
    expect(mockPrintAsync).toHaveBeenCalledWith(
      expect.objectContaining({ uri: expect.any(String) }),
    );
  });
});

describe('ExportActionsConfig', () => {
  it('should accept valid config', () => {
    const config = makeConfig();

    expect(config.pdfBytes).toBeInstanceOf(Uint8Array);
    expect(config.title).toBe('Test Document');
    expect(config.documentId).toBe('doc-123');
  });
});
