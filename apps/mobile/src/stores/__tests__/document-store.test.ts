import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { DetectedField, DocumentPage, ProcessedDocument } from '@fillit/shared';

// ---------------------------------------------------------------------------
// Mock the documentCrud module
// ---------------------------------------------------------------------------

const mockListDocuments = vi.fn<() => Promise<ProcessedDocument[]>>();
const mockGetDocumentWithPages = vi.fn<(id: string) => Promise<ProcessedDocument | null>>();
const mockCreateDocument = vi.fn<(...args: unknown[]) => Promise<ProcessedDocument>>();
const mockUpdateDocument =
  vi.fn<(id: string, ...args: unknown[]) => Promise<ProcessedDocument | null>>();
const mockDeleteDocument = vi.fn<(id: string) => Promise<boolean>>();

const mockCreatePage = vi.fn<(...args: unknown[]) => Promise<DocumentPage>>();
const mockGetPagesByDocumentId = vi.fn<(documentId: string) => Promise<DocumentPage[]>>();
const mockUpdatePage = vi.fn<(...args: unknown[]) => Promise<DocumentPage | null>>();
const mockDeletePage = vi.fn<(id: string) => Promise<boolean>>();

vi.mock('../../services/storage/documentCrud', () => ({
  listDocuments: (...args: unknown[]) => mockListDocuments(...args),
  getDocumentWithPages: (...args: unknown[]) => mockGetDocumentWithPages(args[0] as string),
  createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  updateDocument: (...args: unknown[]) => mockUpdateDocument(args[0] as string, ...args.slice(1)),
  deleteDocument: (...args: unknown[]) => mockDeleteDocument(args[0] as string),
  createPage: (...args: unknown[]) => mockCreatePage(...args),
  getPagesByDocumentId: (...args: unknown[]) => mockGetPagesByDocumentId(args[0] as string),
  updatePage: (...args: unknown[]) => mockUpdatePage(...args),
  deletePage: (...args: unknown[]) => mockDeletePage(args[0] as string),
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import {
  useDocumentStore,
  DEFAULT_DOCUMENT_STATE,
  selectDocuments,
  selectCurrentDocumentId,
  selectCurrentDocument,
  selectDocumentsByStatus,
  selectDocumentsSorted,
  selectDocumentCount,
  selectDocumentById,
  selectCurrentDocumentPages,
  selectCurrentDocumentFields,
  selectIsLoading,
  selectIsMutating,
  selectIsInitialized,
  selectError,
} from '../document-store';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeDocument(overrides: Partial<ProcessedDocument> = {}): ProcessedDocument {
  return {
    id: 'doc-1',
    title: 'Test Document',
    pages: [],
    fields: [],
    status: 'scanned',
    sourceType: 'camera',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makePage(overrides: Partial<DocumentPage> = {}): DocumentPage {
  return {
    id: 'page-1',
    documentId: 'doc-1',
    pageNumber: 1,
    originalImageUri: 'file:///original.jpg',
    ocrText: 'Sample OCR text',
    width: 800,
    height: 1200,
    ...overrides,
  };
}

function makeField(overrides: Partial<DetectedField> = {}): DetectedField {
  return {
    id: 'field-1',
    pageId: 'page-1',
    label: 'Full Name',
    normalizedLabel: 'full_name',
    fieldType: 'text',
    bounds: { x: 10, y: 20, width: 200, height: 30 },
    matchConfidence: 0.95,
    value: 'John Doe',
    isConfirmed: false,
    isSignatureField: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore(): void {
  useDocumentStore.setState({ ...DEFAULT_DOCUMENT_STATE });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

// ─── Default State ────────────────────────────────────────────────────────

describe('default state', () => {
  it('has correct initial values', () => {
    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([]);
    expect(state.currentDocumentId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.mutationCount).toBe(0);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });
});

// ─── Initialization ───────────────────────────────────────────────────────

describe('initialize', () => {
  it('loads documents from SQLite with pages', async () => {
    const doc1 = makeDocument({ id: 'doc-1' });
    const doc2 = makeDocument({ id: 'doc-2', title: 'Second' });
    const docWithPages = {
      ...doc1,
      pages: [makePage()],
    };

    mockListDocuments.mockResolvedValue([doc1, doc2]);
    mockGetDocumentWithPages.mockImplementation(async (id: string) => {
      if (id === 'doc-1') return docWithPages;
      if (id === 'doc-2') return doc2;
      return null;
    });

    await useDocumentStore.getState().initialize();

    const state = useDocumentStore.getState();
    expect(state.documents).toHaveLength(2);
    expect(state.documents[0].pages).toHaveLength(1);
    expect(state.isInitialized).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('does not re-initialize if already initialized', async () => {
    mockListDocuments.mockResolvedValue([makeDocument()]);
    mockGetDocumentWithPages.mockResolvedValue(makeDocument());
    await useDocumentStore.getState().initialize();
    mockListDocuments.mockClear();

    await useDocumentStore.getState().initialize();
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('does not re-initialize while loading', async () => {
    useDocumentStore.setState({ isLoading: true });
    await useDocumentStore.getState().initialize();
    expect(mockListDocuments).not.toHaveBeenCalled();
  });

  it('sets error on failure', async () => {
    mockListDocuments.mockRejectedValue(new Error('DB error'));

    await useDocumentStore.getState().initialize();

    const state = useDocumentStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toEqual({
      operation: 'load',
      message: 'DB error',
      cause: expect.any(Error),
    });
  });

  it('falls back to doc without pages when getDocumentWithPages returns null', async () => {
    const doc = makeDocument();
    mockListDocuments.mockResolvedValue([doc]);
    mockGetDocumentWithPages.mockResolvedValue(null);

    await useDocumentStore.getState().initialize();

    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([doc]);
    expect(state.isInitialized).toBe(true);
  });
});

// ─── setCurrentDocumentId ────────────────────────────────────────────────

describe('setCurrentDocumentId', () => {
  it('sets the current document ID', () => {
    useDocumentStore.getState().setCurrentDocumentId('doc-1');
    expect(useDocumentStore.getState().currentDocumentId).toBe('doc-1');
  });

  it('can set current document to null', () => {
    useDocumentStore.setState({ currentDocumentId: 'doc-1' });
    useDocumentStore.getState().setCurrentDocumentId(null);
    expect(useDocumentStore.getState().currentDocumentId).toBeNull();
  });
});

// ─── Document CRUD ─────────────────────────────────────────────────────────

describe('createDocument', () => {
  it('creates a document, adds to state, and sets as currentDocumentId', async () => {
    const doc = makeDocument();
    mockCreateDocument.mockResolvedValue(doc);

    const result = await useDocumentStore.getState().createDocument({
      id: 'doc-1',
      sourceType: 'camera',
    });

    expect(result).toEqual(doc);
    expect(useDocumentStore.getState().documents).toEqual([doc]);
    expect(useDocumentStore.getState().currentDocumentId).toBe('doc-1');
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('sets error, rethrows, and manages mutationCount on failure', async () => {
    mockCreateDocument.mockRejectedValue(new Error('insert failed'));

    await expect(
      useDocumentStore.getState().createDocument({
        id: 'doc-1',
        sourceType: 'camera',
      }),
    ).rejects.toThrow('insert failed');

    expect(useDocumentStore.getState().mutationCount).toBe(0);
    expect(useDocumentStore.getState().error?.operation).toBe('create');
    expect(useDocumentStore.getState().error?.message).toBe('insert failed');
  });
});

describe('updateDocument', () => {
  it('updates document in state and preserves in-memory pages/fields', async () => {
    const page = makePage();
    const field = makeField();
    const doc = makeDocument({ pages: [page], fields: [field] });
    useDocumentStore.setState({ documents: [doc] });

    const updatedFromDb = makeDocument({
      title: 'Updated Title',
      updatedAt: '2026-02-01T00:00:00Z',
      pages: [],
      fields: [],
    });
    mockUpdateDocument.mockResolvedValue(updatedFromDb);

    const result = await useDocumentStore
      .getState()
      .updateDocument('doc-1', { title: 'Updated Title' });

    expect(result?.title).toBe('Updated Title');
    const stored = useDocumentStore.getState().documents[0];
    expect(stored.title).toBe('Updated Title');
    // In-memory pages and fields should be preserved
    expect(stored.pages).toEqual([page]);
    expect(stored.fields).toEqual([field]);
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('returns null when document not found', async () => {
    mockUpdateDocument.mockResolvedValue(null);

    const result = await useDocumentStore.getState().updateDocument('nonexistent', { title: 'X' });

    expect(result).toBeNull();
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('sets error and rethrows on failure', async () => {
    mockUpdateDocument.mockRejectedValue(new Error('update failed'));

    await expect(
      useDocumentStore.getState().updateDocument('doc-1', { title: 'X' }),
    ).rejects.toThrow('update failed');
    expect(useDocumentStore.getState().error?.operation).toBe('update');
  });
});

describe('deleteDocument', () => {
  it('removes document from state and clears currentDocumentId when it was current', async () => {
    const doc = makeDocument();
    useDocumentStore.setState({
      documents: [doc],
      currentDocumentId: 'doc-1',
    });
    mockDeleteDocument.mockResolvedValue(true);

    const result = await useDocumentStore.getState().deleteDocument('doc-1');

    expect(result).toBe(true);
    expect(useDocumentStore.getState().documents).toEqual([]);
    expect(useDocumentStore.getState().currentDocumentId).toBeNull();
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('preserves currentDocumentId when deleting a different document', async () => {
    const doc1 = makeDocument({ id: 'doc-1' });
    const doc2 = makeDocument({ id: 'doc-2' });
    useDocumentStore.setState({
      documents: [doc1, doc2],
      currentDocumentId: 'doc-1',
    });
    mockDeleteDocument.mockResolvedValue(true);

    await useDocumentStore.getState().deleteDocument('doc-2');

    expect(useDocumentStore.getState().documents).toHaveLength(1);
    expect(useDocumentStore.getState().currentDocumentId).toBe('doc-1');
  });

  it('does not modify store on failed delete', async () => {
    const doc = makeDocument();
    useDocumentStore.setState({
      documents: [doc],
      currentDocumentId: 'doc-1',
    });
    mockDeleteDocument.mockResolvedValue(false);

    const result = await useDocumentStore.getState().deleteDocument('doc-1');

    expect(result).toBe(false);
    expect(useDocumentStore.getState().documents).toHaveLength(1);
    expect(useDocumentStore.getState().currentDocumentId).toBe('doc-1');
  });

  it('sets error and rethrows on failure', async () => {
    mockDeleteDocument.mockRejectedValue(new Error('delete failed'));

    await expect(useDocumentStore.getState().deleteDocument('doc-1')).rejects.toThrow(
      'delete failed',
    );
    expect(useDocumentStore.getState().error?.operation).toBe('delete');
  });
});

// ─── Page Actions ─────────────────────────────────────────────────────────

describe('page actions', () => {
  const doc = makeDocument({ id: 'doc-1', pages: [] });

  beforeEach(() => {
    useDocumentStore.setState({
      documents: [doc],
      currentDocumentId: 'doc-1',
    });
  });

  describe('createPage', () => {
    it('creates a page and refreshes pages on parent document', async () => {
      const newPage = makePage();
      mockCreatePage.mockResolvedValue(newPage);
      mockGetPagesByDocumentId.mockResolvedValue([newPage]);

      const result = await useDocumentStore.getState().createPage({
        id: 'page-1',
        documentId: 'doc-1',
        pageNumber: 1,
        originalImageUri: 'file:///original.jpg',
      });

      expect(result).toEqual(newPage);
      expect(useDocumentStore.getState().documents[0].pages).toEqual([newPage]);
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });

    it('sets error and rethrows on failure', async () => {
      mockCreatePage.mockRejectedValue(new Error('page create failed'));

      await expect(
        useDocumentStore.getState().createPage({
          id: 'page-1',
          documentId: 'doc-1',
          pageNumber: 1,
          originalImageUri: 'file:///original.jpg',
        }),
      ).rejects.toThrow('page create failed');
      expect(useDocumentStore.getState().error?.operation).toBe('createPage');
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });
  });

  describe('updatePage', () => {
    it('updates a page and refreshes pages on parent document', async () => {
      const existingPage = makePage();
      useDocumentStore.setState({
        documents: [{ ...doc, pages: [existingPage] }],
      });

      const updatedPage = makePage({ ocrText: 'Updated OCR' });
      mockUpdatePage.mockResolvedValue(updatedPage);
      mockGetPagesByDocumentId.mockResolvedValue([updatedPage]);

      const result = await useDocumentStore
        .getState()
        .updatePage('page-1', { ocrText: 'Updated OCR' }, 'doc-1');

      expect(result?.ocrText).toBe('Updated OCR');
      expect(useDocumentStore.getState().documents[0].pages[0].ocrText).toBe('Updated OCR');
    });

    it('returns null when page not found', async () => {
      mockUpdatePage.mockResolvedValue(null);

      const result = await useDocumentStore
        .getState()
        .updatePage('nonexistent', { ocrText: 'X' }, 'doc-1');

      expect(result).toBeNull();
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });

    it('sets error and rethrows on failure', async () => {
      mockUpdatePage.mockRejectedValue(new Error('page update failed'));

      await expect(
        useDocumentStore.getState().updatePage('page-1', { ocrText: 'X' }, 'doc-1'),
      ).rejects.toThrow('page update failed');
      expect(useDocumentStore.getState().error?.operation).toBe('updatePage');
    });
  });

  describe('deletePage', () => {
    it('removes page from parent document pages array', async () => {
      const page1 = makePage({ id: 'page-1' });
      const page2 = makePage({ id: 'page-2', pageNumber: 2 });
      useDocumentStore.setState({
        documents: [{ ...doc, pages: [page1, page2] }],
      });
      mockDeletePage.mockResolvedValue(true);

      const result = await useDocumentStore.getState().deletePage('page-1', 'doc-1');

      expect(result).toBe(true);
      expect(useDocumentStore.getState().documents[0].pages).toEqual([page2]);
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });

    it('does not modify store on failed delete', async () => {
      const page = makePage();
      useDocumentStore.setState({
        documents: [{ ...doc, pages: [page] }],
      });
      mockDeletePage.mockResolvedValue(false);

      const result = await useDocumentStore.getState().deletePage('page-1', 'doc-1');

      expect(result).toBe(false);
      expect(useDocumentStore.getState().documents[0].pages).toHaveLength(1);
    });

    it('sets error and rethrows on failure', async () => {
      mockDeletePage.mockRejectedValue(new Error('page delete failed'));

      await expect(useDocumentStore.getState().deletePage('page-1', 'doc-1')).rejects.toThrow(
        'page delete failed',
      );
      expect(useDocumentStore.getState().error?.operation).toBe('deletePage');
    });
  });
});

// ─── Processing Actions ──────────────────────────────────────────────────

describe('processing actions', () => {
  describe('updateStatus', () => {
    it('updates status and updatedAt on the document', async () => {
      const doc = makeDocument({ status: 'scanned' });
      useDocumentStore.setState({ documents: [doc] });

      const updatedDoc = makeDocument({
        status: 'ocr_complete',
        updatedAt: '2026-02-01T00:00:00Z',
      });
      mockUpdateDocument.mockResolvedValue(updatedDoc);

      const result = await useDocumentStore.getState().updateStatus('doc-1', 'ocr_complete');

      expect(result?.status).toBe('ocr_complete');
      const stored = useDocumentStore.getState().documents[0];
      expect(stored.status).toBe('ocr_complete');
      expect(stored.updatedAt).toBe('2026-02-01T00:00:00Z');
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });

    it('handles null return (document not found)', async () => {
      mockUpdateDocument.mockResolvedValue(null);

      const result = await useDocumentStore.getState().updateStatus('nonexistent', 'ocr_complete');

      expect(result).toBeNull();
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });

    it('sets error and rethrows on failure (e.g., invalid transition)', async () => {
      mockUpdateDocument.mockRejectedValue(
        new Error("Invalid status transition from 'scanned' to 'exported'"),
      );

      await expect(useDocumentStore.getState().updateStatus('doc-1', 'exported')).rejects.toThrow(
        'Invalid status transition',
      );
      expect(useDocumentStore.getState().error?.operation).toBe('updateStatus');
      expect(useDocumentStore.getState().mutationCount).toBe(0);
    });
  });

  describe('setFields', () => {
    it('sets fields in-memory only (no CRUD call)', () => {
      const doc = makeDocument();
      useDocumentStore.setState({ documents: [doc] });

      const fields = [makeField(), makeField({ id: 'field-2', label: 'DOB' })];
      useDocumentStore.getState().setFields('doc-1', fields);

      expect(useDocumentStore.getState().documents[0].fields).toEqual(fields);
      // No CRUD calls should have been made
      expect(mockCreateDocument).not.toHaveBeenCalled();
      expect(mockUpdateDocument).not.toHaveBeenCalled();
    });

    it('does not affect documents that do not match the ID', () => {
      const doc1 = makeDocument({ id: 'doc-1' });
      const doc2 = makeDocument({ id: 'doc-2' });
      useDocumentStore.setState({ documents: [doc1, doc2] });

      const fields = [makeField()];
      useDocumentStore.getState().setFields('doc-1', fields);

      expect(useDocumentStore.getState().documents[0].fields).toEqual(fields);
      expect(useDocumentStore.getState().documents[1].fields).toEqual([]);
    });
  });
});

// ─── Selectors ────────────────────────────────────────────────────────────

describe('selectors', () => {
  const page = makePage();
  const field = makeField();
  const doc1 = makeDocument({
    id: 'doc-1',
    title: 'Beta Doc',
    status: 'scanned',
    createdAt: '2026-01-01T00:00:00Z',
    pages: [page],
    fields: [field],
  });
  const doc2 = makeDocument({
    id: 'doc-2',
    title: 'Alpha Doc',
    status: 'exported',
    createdAt: '2026-02-01T00:00:00Z',
    pages: [],
    fields: [],
  });

  beforeEach(() => {
    useDocumentStore.setState({
      documents: [doc1, doc2],
      currentDocumentId: 'doc-1',
      isLoading: false,
      mutationCount: 1,
      isInitialized: true,
      error: { operation: 'load', message: 'test' },
    });
  });

  it('selectDocuments returns all documents', () => {
    expect(selectDocuments(useDocumentStore.getState())).toEqual([doc1, doc2]);
  });

  it('selectCurrentDocumentId returns the current ID', () => {
    expect(selectCurrentDocumentId(useDocumentStore.getState())).toBe('doc-1');
  });

  it('selectCurrentDocument derives the current document', () => {
    expect(selectCurrentDocument(useDocumentStore.getState())).toEqual(doc1);
  });

  it('selectCurrentDocument returns null when no document selected', () => {
    useDocumentStore.setState({ currentDocumentId: null });
    expect(selectCurrentDocument(useDocumentStore.getState())).toBeNull();
  });

  it('selectCurrentDocument returns null when ID does not match', () => {
    useDocumentStore.setState({ currentDocumentId: 'nonexistent' });
    expect(selectCurrentDocument(useDocumentStore.getState())).toBeNull();
  });

  it('selectDocumentsByStatus filters by status', () => {
    const scanned = selectDocumentsByStatus('scanned')(useDocumentStore.getState());
    expect(scanned).toEqual([doc1]);

    const exported = selectDocumentsByStatus('exported')(useDocumentStore.getState());
    expect(exported).toEqual([doc2]);

    const ocrComplete = selectDocumentsByStatus('ocr_complete')(useDocumentStore.getState());
    expect(ocrComplete).toEqual([]);
  });

  it('selectDocumentsSorted by createdAt desc', () => {
    const sorted = selectDocumentsSorted('createdAt', 'desc')(useDocumentStore.getState());
    expect(sorted[0].id).toBe('doc-2');
    expect(sorted[1].id).toBe('doc-1');
  });

  it('selectDocumentsSorted by createdAt asc', () => {
    const sorted = selectDocumentsSorted('createdAt', 'asc')(useDocumentStore.getState());
    expect(sorted[0].id).toBe('doc-1');
    expect(sorted[1].id).toBe('doc-2');
  });

  it('selectDocumentsSorted by title asc (alphabetical)', () => {
    const sorted = selectDocumentsSorted('title', 'asc')(useDocumentStore.getState());
    expect(sorted[0].title).toBe('Alpha Doc');
    expect(sorted[1].title).toBe('Beta Doc');
  });

  it('selectDocumentsSorted by title desc (reverse alphabetical)', () => {
    const sorted = selectDocumentsSorted('title', 'desc')(useDocumentStore.getState());
    expect(sorted[0].title).toBe('Beta Doc');
    expect(sorted[1].title).toBe('Alpha Doc');
  });

  it('selectDocumentsSorted handles equal values without reordering', () => {
    const sameDate = '2026-01-15T00:00:00Z';
    useDocumentStore.setState({
      documents: [
        makeDocument({ id: 'doc-a', createdAt: sameDate }),
        makeDocument({ id: 'doc-b', createdAt: sameDate }),
      ],
    });
    const sorted = selectDocumentsSorted('createdAt', 'asc')(useDocumentStore.getState());
    expect(sorted).toHaveLength(2);
    // Both have same createdAt, so original order is preserved
    expect(sorted[0].id).toBe('doc-a');
    expect(sorted[1].id).toBe('doc-b');
  });

  it('selectDocumentCount returns count', () => {
    expect(selectDocumentCount(useDocumentStore.getState())).toBe(2);
  });

  it('selectDocumentCount returns 0 when empty', () => {
    useDocumentStore.setState({ documents: [] });
    expect(selectDocumentCount(useDocumentStore.getState())).toBe(0);
  });

  it('selectDocumentById returns matching document', () => {
    expect(selectDocumentById('doc-2')(useDocumentStore.getState())).toEqual(doc2);
  });

  it('selectDocumentById returns null for unknown ID', () => {
    expect(selectDocumentById('unknown')(useDocumentStore.getState())).toBeNull();
  });

  it('selectCurrentDocumentPages returns pages of current document', () => {
    expect(selectCurrentDocumentPages(useDocumentStore.getState())).toEqual([page]);
  });

  it('selectCurrentDocumentPages returns [] when no current document', () => {
    useDocumentStore.setState({ currentDocumentId: null });
    expect(selectCurrentDocumentPages(useDocumentStore.getState())).toEqual([]);
  });

  it('selectCurrentDocumentFields returns fields of current document', () => {
    expect(selectCurrentDocumentFields(useDocumentStore.getState())).toEqual([field]);
  });

  it('selectCurrentDocumentFields returns [] when no current document', () => {
    useDocumentStore.setState({ currentDocumentId: null });
    expect(selectCurrentDocumentFields(useDocumentStore.getState())).toEqual([]);
  });

  it('selectIsLoading returns loading state', () => {
    expect(selectIsLoading(useDocumentStore.getState())).toBe(false);
  });

  it('selectIsMutating derives from mutationCount', () => {
    expect(selectIsMutating(useDocumentStore.getState())).toBe(true);
    useDocumentStore.setState({ mutationCount: 0 });
    expect(selectIsMutating(useDocumentStore.getState())).toBe(false);
    useDocumentStore.setState({ mutationCount: 3 });
    expect(selectIsMutating(useDocumentStore.getState())).toBe(true);
  });

  it('selectIsInitialized returns initialized state', () => {
    expect(selectIsInitialized(useDocumentStore.getState())).toBe(true);
  });

  it('selectError returns error state', () => {
    expect(selectError(useDocumentStore.getState())).toEqual({
      operation: 'load',
      message: 'test',
    });
  });
});

// ─── State Management ────────────────────────────────────────────────────

describe('mutationCount tracking', () => {
  it('increments on mutation start and decrements on success', async () => {
    const doc = makeDocument();
    mockCreateDocument.mockResolvedValue(doc);

    // After successful create, mutationCount should be back to 0
    await useDocumentStore.getState().createDocument({
      id: 'doc-1',
      sourceType: 'camera',
    });
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('decrements on mutation failure', async () => {
    mockCreateDocument.mockRejectedValue(new Error('fail'));

    await useDocumentStore
      .getState()
      .createDocument({ id: 'doc-1', sourceType: 'camera' })
      .catch(() => {});
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });

  it('tracks concurrent mutations correctly', async () => {
    const doc1 = makeDocument({ id: 'doc-1' });
    const doc2 = makeDocument({ id: 'doc-2' });

    // Use manual resolution to control timing
    let resolveFirst!: (v: ProcessedDocument) => void;
    let resolveSecond!: (v: ProcessedDocument) => void;

    mockCreateDocument
      .mockReturnValueOnce(
        new Promise<ProcessedDocument>((r) => {
          resolveFirst = r;
        }),
      )
      .mockReturnValueOnce(
        new Promise<ProcessedDocument>((r) => {
          resolveSecond = r;
        }),
      );

    const p1 = useDocumentStore.getState().createDocument({
      id: 'doc-1',
      sourceType: 'camera',
    });
    const p2 = useDocumentStore.getState().createDocument({
      id: 'doc-2',
      sourceType: 'import',
    });

    // Both mutations in flight
    expect(useDocumentStore.getState().mutationCount).toBe(2);

    resolveFirst(doc1);
    await p1;
    expect(useDocumentStore.getState().mutationCount).toBe(1);

    resolveSecond(doc2);
    await p2;
    expect(useDocumentStore.getState().mutationCount).toBe(0);
  });
});

describe('clearError', () => {
  it('clears the error state', () => {
    useDocumentStore.setState({
      error: { operation: 'load', message: 'test' },
    });

    useDocumentStore.getState().clearError();

    expect(useDocumentStore.getState().error).toBeNull();
  });
});

describe('reset', () => {
  it('resets to default state', () => {
    useDocumentStore.setState({
      documents: [makeDocument()],
      currentDocumentId: 'doc-1',
      isLoading: true,
      mutationCount: 1,
      isInitialized: true,
      error: { operation: 'load', message: 'test' },
    });

    useDocumentStore.getState().reset();

    const state = useDocumentStore.getState();
    expect(state.documents).toEqual([]);
    expect(state.currentDocumentId).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.mutationCount).toBe(0);
    expect(state.isInitialized).toBe(false);
    expect(state.error).toBeNull();
  });
});
