import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockScanDocument, mockAlert, mockDocumentStore, mockProcessingStore, mockSaveFile } =
  vi.hoisted(() => {
    const mockScanDocument = vi.fn();
    const mockAlert = { alert: vi.fn() };
    const mockSaveFile = vi.fn(
      (docId: string, _sub: string, filename: string) =>
        `file:///documents/${docId}/originals/${filename}`,
    );

    const mockDocumentStore = {
      createDocument: vi.fn(),
      createPage: vi.fn(),
    };

    const mockProcessingStore = {
      startProcessing: vi.fn(),
      completeCurrentStage: vi.fn(),
      advanceStage: vi.fn(),
    };

    return { mockScanDocument, mockAlert, mockDocumentStore, mockProcessingStore, mockSaveFile };
  });

// Track React hook calls
let useStateCalls: { initial: boolean; setter: ReturnType<typeof vi.fn> }[] = [];
let callbackFns: ((...args: unknown[]) => unknown)[] = [];

vi.mock('react', () => ({
  useState: vi.fn((initial: boolean) => {
    const setter = vi.fn();
    useStateCalls.push({ initial, setter });
    return [initial, setter];
  }),
  useCallback: vi.fn((cb: (...args: unknown[]) => unknown) => {
    callbackFns.push(cb);
    return cb;
  }),
}));

vi.mock('../services/scanner/documentScanner', () => ({
  scanDocument: mockScanDocument,
}));

vi.mock('react-native', () => ({
  Alert: mockAlert,
}));

vi.mock('../services/storage/fileStorage', () => ({
  saveFile: mockSaveFile,
}));

vi.mock('../stores/document-store', () => ({
  useDocumentStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockDocumentStore),
}));

vi.mock('../stores/processing-store', () => ({
  useProcessingStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector(mockProcessingStore),
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { useScanDocument } from '../hooks/useScanDocument';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function callHook(options?: Parameters<typeof useScanDocument>[0]) {
  useStateCalls = [];
  callbackFns = [];
  return useScanDocument(options);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useScanDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStateCalls = [];
    callbackFns = [];

    mockDocumentStore.createDocument.mockResolvedValue({
      id: 'doc-1',
      title: 'Scan',
      pages: [],
      fields: [],
      status: 'scanned',
      sourceType: 'camera',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    mockDocumentStore.createPage.mockResolvedValue({
      id: 'page-1',
      documentId: 'doc-1',
      pageNumber: 1,
      originalImageUri: 'file:///saved.jpg',
      ocrText: '',
      width: 0,
      height: 0,
    });
  });

  it('returns isScanning as false initially', () => {
    const result = callHook();
    expect(result.isScanning).toBe(false);
  });

  it('returns a scan function', () => {
    const result = callHook();
    expect(typeof result.scan).toBe('function');
  });

  it('creates document and pages on successful scan', async () => {
    const pages = ['file:///tmp/page1.jpg', 'file:///tmp/page2.jpg'];
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages, pageCount: 2 },
    });

    const onSuccess = vi.fn();
    const { scan } = callHook({ onSuccess });

    await scan();

    // Should create a document with camera source type
    expect(mockDocumentStore.createDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: 'camera',
      }),
    );

    // Should start processing pipeline
    expect(mockProcessingStore.startProcessing).toHaveBeenCalledWith(expect.any(String));

    // Should save each page to file storage
    expect(mockSaveFile).toHaveBeenCalledTimes(2);
    expect(mockSaveFile).toHaveBeenCalledWith(
      expect.any(String),
      'originals',
      'page-1.jpg',
      'file:///tmp/page1.jpg',
    );
    expect(mockSaveFile).toHaveBeenCalledWith(
      expect.any(String),
      'originals',
      'page-2.jpg',
      'file:///tmp/page2.jpg',
    );

    // Should create page records in the database
    expect(mockDocumentStore.createPage).toHaveBeenCalledTimes(2);

    // Should complete scanning stage and advance pipeline
    expect(mockProcessingStore.completeCurrentStage).toHaveBeenCalled();
    expect(mockProcessingStore.advanceStage).toHaveBeenCalled();

    // Should call onSuccess callback
    expect(onSuccess).toHaveBeenCalledWith(expect.any(String), 2);
  });

  it('does nothing when scan is canceled', async () => {
    mockScanDocument.mockResolvedValue({ status: 'canceled' });

    const onSuccess = vi.fn();
    const { scan } = callHook({ onSuccess });

    await scan();

    expect(mockDocumentStore.createDocument).not.toHaveBeenCalled();
    expect(mockProcessingStore.startProcessing).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('shows alert on scanner error', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'error',
      error: new Error('Camera permission denied'),
    });

    const { scan } = callHook();

    await scan();

    expect(mockAlert.alert).toHaveBeenCalledWith('Scan Failed', 'Camera permission denied');
    expect(mockDocumentStore.createDocument).not.toHaveBeenCalled();
  });

  it('shows alert on unexpected error during document creation', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages: ['file:///tmp/page1.jpg'], pageCount: 1 },
    });
    mockDocumentStore.createDocument.mockRejectedValue(new Error('DB write failed'));

    const { scan } = callHook();

    await scan();

    expect(mockAlert.alert).toHaveBeenCalledWith('Scan Error', 'DB write failed');
  });

  it('calls setIsScanning(true) at start and setIsScanning(false) in finally', async () => {
    mockScanDocument.mockResolvedValue({ status: 'canceled' });

    const { scan } = callHook();
    const setter = useStateCalls[0]!.setter;

    await scan();

    // First call: setIsScanning(true)
    expect(setter).toHaveBeenCalledWith(true);
    // Last call: setIsScanning(false) in finally
    const calls = setter.mock.calls;
    expect(calls[calls.length - 1]![0]).toBe(false);
  });

  it('resets isScanning after error', async () => {
    mockScanDocument.mockRejectedValue(new Error('unexpected'));

    const { scan } = callHook();
    const setter = useStateCalls[0]!.setter;

    await scan();

    const calls = setter.mock.calls;
    expect(calls[calls.length - 1]![0]).toBe(false);
  });

  it('passes custom config to scanDocument', async () => {
    mockScanDocument.mockResolvedValue({ status: 'canceled' });

    const config = { pageLimit: 5, galleryImportAllowed: false };
    const { scan } = callHook({ config });

    await scan();

    expect(mockScanDocument).toHaveBeenCalledWith(config);
  });

  it('generates unique IDs for document and each page', async () => {
    const pages = ['file:///tmp/p1.jpg', 'file:///tmp/p2.jpg', 'file:///tmp/p3.jpg'];
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages, pageCount: 3 },
    });

    const { scan } = callHook();

    await scan();

    // Document ID
    const docCall = mockDocumentStore.createDocument.mock.calls[0]![0] as { id: string };
    expect(docCall.id).toBeTruthy();
    expect(typeof docCall.id).toBe('string');

    // Page IDs should all be unique
    const pageIds = mockDocumentStore.createPage.mock.calls.map(
      (call: [{ id: string }]) => call[0].id,
    );
    expect(new Set(pageIds).size).toBe(3);

    // Page IDs should differ from document ID
    for (const pageId of pageIds) {
      expect(pageId).not.toBe(docCall.id);
    }
  });

  it('creates pages with correct sequential page numbers', async () => {
    const pages = ['file:///tmp/p1.jpg', 'file:///tmp/p2.jpg'];
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages, pageCount: 2 },
    });

    const { scan } = callHook();

    await scan();

    const pageCalls = mockDocumentStore.createPage.mock.calls as [{ pageNumber: number }][];
    expect(pageCalls[0]![0].pageNumber).toBe(1);
    expect(pageCalls[1]![0].pageNumber).toBe(2);
  });

  it('sets document title starting with "Scan "', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages: ['file:///tmp/p1.jpg'], pageCount: 1 },
    });

    const { scan } = callHook();

    await scan();

    const docCall = mockDocumentStore.createDocument.mock.calls[0]![0] as { title: string };
    expect(docCall.title).toMatch(/^Scan /);
  });

  it('links saved file URIs to page records', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages: ['file:///tmp/scan.jpg'], pageCount: 1 },
    });

    const { scan } = callHook();

    await scan();

    const pageCall = mockDocumentStore.createPage.mock.calls[0]![0] as {
      originalImageUri: string;
    };
    // The saveFile mock returns a predictable URI
    expect(pageCall.originalImageUri).toContain('/originals/page-1.jpg');
  });

  it('uses consistent document ID across all operations', async () => {
    mockScanDocument.mockResolvedValue({
      status: 'success',
      data: { pages: ['file:///tmp/p1.jpg'], pageCount: 1 },
    });

    const { scan } = callHook();

    await scan();

    const docId = (mockDocumentStore.createDocument.mock.calls[0]![0] as { id: string }).id;

    // Same ID used for startProcessing
    expect(mockProcessingStore.startProcessing).toHaveBeenCalledWith(docId);

    // Same ID used for saveFile
    expect(mockSaveFile).toHaveBeenCalledWith(docId, 'originals', 'page-1.jpg', expect.any(String));

    // Same ID used for createPage
    const pageCall = mockDocumentStore.createPage.mock.calls[0]![0] as { documentId: string };
    expect(pageCall.documentId).toBe(docId);
  });
});
