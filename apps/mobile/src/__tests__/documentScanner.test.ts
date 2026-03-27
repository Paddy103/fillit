import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockLaunchScanner, mockPlatform } = vi.hoisted(() => {
  const mockLaunchScanner = vi.fn();
  const mockPlatform = { OS: 'android' as string };
  return { mockLaunchScanner, mockPlatform };
});

vi.mock('@infinitered/react-native-mlkit-document-scanner', () => ({
  launchDocumentScannerAsync: mockLaunchScanner,
  ResultFormatOptions: { ALL: 'all', PDF: 'pdf', JPEG: 'jpeg' },
  ScannerModeOptions: { FULL: 'full', BASE_WITH_FILTER: 'base_with_filter', BASE: 'base' },
}));

vi.mock('react-native', () => ({
  Platform: mockPlatform,
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { scanDocument } from '../services/scanner/documentScanner';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('documentScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPlatform.OS = 'android';
  });

  describe('scanDocument', () => {
    it('returns success with page URIs on successful scan', async () => {
      const pages = ['file:///tmp/page1.jpg', 'file:///tmp/page2.jpg'];
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages,
        pdf: null,
      });

      const result = await scanDocument();

      expect(result).toEqual({
        status: 'success',
        data: { pages, pageCount: 2 },
      });
    });

    it('passes default config to launchDocumentScannerAsync', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: ['file:///tmp/page1.jpg'],
        pdf: null,
      });

      await scanDocument();

      expect(mockLaunchScanner).toHaveBeenCalledWith({
        pageLimit: 20,
        galleryImportAllowed: true,
        scannerMode: 'full',
        resultFormats: 'jpeg',
      });
    });

    it('passes custom config overrides', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: ['file:///tmp/page1.jpg'],
        pdf: null,
      });

      await scanDocument({ pageLimit: 5, galleryImportAllowed: false });

      expect(mockLaunchScanner).toHaveBeenCalledWith({
        pageLimit: 5,
        galleryImportAllowed: false,
        scannerMode: 'full',
        resultFormats: 'jpeg',
      });
    });

    it('returns canceled when user cancels the scanner', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: true,
        pages: null,
        pdf: null,
      });

      const result = await scanDocument();

      expect(result).toEqual({ status: 'canceled' });
    });

    it('returns error when scanner returns no pages', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: [],
        pdf: null,
      });

      const result = await scanDocument();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Scanner returned no pages');
      }
    });

    it('returns error when scanner returns null pages', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: null,
        pdf: null,
      });

      const result = await scanDocument();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error.message).toBe('Scanner returned no pages');
      }
    });

    it('returns error when launchDocumentScannerAsync throws', async () => {
      mockLaunchScanner.mockRejectedValue(new Error('Camera permission denied'));

      const result = await scanDocument();

      expect(result).toEqual({
        status: 'error',
        error: expect.objectContaining({ message: 'Camera permission denied' }),
      });
    });

    it('wraps non-Error thrown values in an Error', async () => {
      mockLaunchScanner.mockRejectedValue('string error');

      const result = await scanDocument();

      expect(result.status).toBe('error');
      if (result.status === 'error') {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('string error');
      }
    });

    it('returns error on web platform', async () => {
      mockPlatform.OS = 'web';

      const result = await scanDocument();

      expect(result).toEqual({
        status: 'error',
        error: expect.objectContaining({
          message: 'Document scanning is not supported on web',
        }),
      });
      expect(mockLaunchScanner).not.toHaveBeenCalled();
    });

    it('works on iOS platform', async () => {
      mockPlatform.OS = 'ios';
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: ['file:///tmp/page1.jpg'],
        pdf: null,
      });

      const result = await scanDocument();

      expect(result.status).toBe('success');
      expect(mockLaunchScanner).toHaveBeenCalled();
    });

    it('handles single-page scan', async () => {
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages: ['file:///tmp/single.jpg'],
        pdf: null,
      });

      const result = await scanDocument({ pageLimit: 1 });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.pageCount).toBe(1);
        expect(result.data.pages).toHaveLength(1);
      }
    });

    it('handles multi-page scan up to limit', async () => {
      const pages = Array.from({ length: 10 }, (_, i) => `file:///tmp/page${i + 1}.jpg`);
      mockLaunchScanner.mockResolvedValue({
        canceled: false,
        pages,
        pdf: null,
      });

      const result = await scanDocument({ pageLimit: 10 });

      expect(result.status).toBe('success');
      if (result.status === 'success') {
        expect(result.data.pageCount).toBe(10);
        expect(result.data.pages).toHaveLength(10);
      }
    });
  });
});
