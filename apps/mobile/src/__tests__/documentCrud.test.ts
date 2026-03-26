import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockRunQuery, mockGetFirst, mockGetAll, mockWithTransaction, mockDeleteDocumentFiles } =
  vi.hoisted(() => ({
    mockRunQuery: vi.fn(),
    mockGetFirst: vi.fn(),
    mockGetAll: vi.fn(),
    mockWithTransaction: vi.fn(async (cb: () => Promise<void>) => {
      await cb();
    }),
    mockDeleteDocumentFiles: vi.fn(),
  }));

vi.mock('../services/storage/database', () => ({
  runQuery: mockRunQuery,
  getFirst: mockGetFirst,
  getAll: mockGetAll,
  withTransaction: mockWithTransaction,
}));

vi.mock('../services/storage/fileStorage', () => ({
  deleteDocumentFiles: mockDeleteDocumentFiles,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  createDocument,
  getDocumentById,
  getDocumentWithPages,
  listDocuments,
  updateDocument,
  deleteDocument,
  countDocuments,
  createPage,
  getPageById,
  getPagesByDocumentId,
  updatePage,
  deletePage,
  deletePagesByDocumentId,
  countPages,
  createDocumentWithPages,
  deleteDocumentWithCleanup,
  isValidStatusTransition,
  type CreateDocumentInput,
  type CreatePageInput,
} from '../services/storage/documentCrud';

import { QueryError } from '../services/storage/databaseErrors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDocumentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'doc-1',
    title: 'Test Document',
    status: 'scanned',
    source_type: 'camera',
    document_type: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    exported_pdf_uri: null,
    ...overrides,
  };
}

function makePageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-1',
    document_id: 'doc-1',
    page_number: 1,
    original_image_uri: 'file:///originals/page-1.jpg',
    processed_image_uri: null,
    ocr_text: null,
    width: null,
    height: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('Document CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── isValidStatusTransition ──────────────────────────────────────────

  describe('isValidStatusTransition', () => {
    it('should allow scanned → ocr_complete', () => {
      expect(isValidStatusTransition('scanned', 'ocr_complete')).toBe(true);
    });

    it('should allow ocr_complete → fields_detected', () => {
      expect(isValidStatusTransition('ocr_complete', 'fields_detected')).toBe(true);
    });

    it('should allow fields_detected → matched', () => {
      expect(isValidStatusTransition('fields_detected', 'matched')).toBe(true);
    });

    it('should allow matched → reviewed', () => {
      expect(isValidStatusTransition('matched', 'reviewed')).toBe(true);
    });

    it('should allow reviewed → exported', () => {
      expect(isValidStatusTransition('reviewed', 'exported')).toBe(true);
    });

    it('should reject skipping steps (scanned → fields_detected)', () => {
      expect(isValidStatusTransition('scanned', 'fields_detected')).toBe(false);
    });

    it('should reject backward transitions (exported → scanned)', () => {
      expect(isValidStatusTransition('exported', 'scanned')).toBe(false);
    });

    it('should reject same-status transitions', () => {
      expect(isValidStatusTransition('scanned', 'scanned')).toBe(false);
    });

    it('should reject transitions from exported (terminal state)', () => {
      expect(isValidStatusTransition('exported', 'reviewed')).toBe(false);
    });
  });

  // ── createDocument ───────────────────────────────────────────────────

  describe('createDocument', () => {
    it('should insert a document with scanned status', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const input: CreateDocumentInput = {
        id: 'doc-1',
        title: 'My Form',
        sourceType: 'camera',
        documentType: 'medical form',
      };

      const result = await createDocument(input);

      expect(mockRunQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('INSERT INTO documents');
      expect(params[0]).toBe('doc-1');
      expect(params[1]).toBe('My Form');
      expect(params[2]).toBe('scanned');
      expect(params[3]).toBe('camera');
      expect(params[4]).toBe('medical form');

      expect(result.id).toBe('doc-1');
      expect(result.title).toBe('My Form');
      expect(result.status).toBe('scanned');
      expect(result.sourceType).toBe('camera');
      expect(result.documentType).toBe('medical form');
      expect(result.pages).toEqual([]);
      expect(result.fields).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const result = await createDocument({
        id: 'doc-2',
        sourceType: 'import',
      });

      const [, params] = mockRunQuery.mock.calls[0]!;
      expect(params[1]).toBeNull(); // title
      expect(params[4]).toBeNull(); // documentType

      expect(result.title).toBe('');
      expect(result.documentType).toBeUndefined();
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const before = new Date().toISOString();
      const result = await createDocument({
        id: 'doc-3',
        sourceType: 'camera',
      });
      const after = new Date().toISOString();

      expect(result.createdAt >= before).toBe(true);
      expect(result.createdAt <= after).toBe(true);
      expect(result.updatedAt).toBe(result.createdAt);
    });

    it('should propagate QueryError on insert failure', async () => {
      mockRunQuery.mockRejectedValueOnce(new QueryError('UNIQUE constraint failed'));

      await expect(createDocument({ id: 'dup', sourceType: 'camera' })).rejects.toThrow(QueryError);
    });
  });

  // ── getDocumentById ──────────────────────────────────────────────────

  describe('getDocumentById', () => {
    it('should return a mapped document when found', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow());

      const result = await getDocumentById('doc-1');

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM documents WHERE id = ?', ['doc-1']);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('doc-1');
      expect(result!.title).toBe('Test Document');
      expect(result!.status).toBe('scanned');
      expect(result!.sourceType).toBe('camera');
      expect(result!.pages).toEqual([]);
      expect(result!.fields).toEqual([]);
    });

    it('should return null when document not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getDocumentById('nonexistent');
      expect(result).toBeNull();
    });

    it('should map null title to empty string', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ title: null }));

      const result = await getDocumentById('doc-1');
      expect(result!.title).toBe('');
    });

    it('should map null document_type to undefined', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ document_type: null }));

      const result = await getDocumentById('doc-1');
      expect(result!.documentType).toBeUndefined();
    });

    it('should map non-null document_type correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ document_type: 'tax return' }));

      const result = await getDocumentById('doc-1');
      expect(result!.documentType).toBe('tax return');
    });

    it('should map non-null exported_pdf_uri correctly', async () => {
      mockGetFirst.mockResolvedValueOnce(
        makeDocumentRow({ exported_pdf_uri: 'file:///pdf/doc-1.pdf' }),
      );

      const result = await getDocumentById('doc-1');
      expect(result!.exportedPdfUri).toBe('file:///pdf/doc-1.pdf');
    });
  });

  // ── getDocumentWithPages ─────────────────────────────────────────────

  describe('getDocumentWithPages', () => {
    it('should return document with pages populated', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow());
      mockGetAll.mockResolvedValueOnce([
        makePageRow({ id: 'page-1', page_number: 1 }),
        makePageRow({ id: 'page-2', page_number: 2 }),
      ]);

      const result = await getDocumentWithPages('doc-1');

      expect(result).not.toBeNull();
      expect(result!.pages).toHaveLength(2);
      expect(result!.pages[0]!.id).toBe('page-1');
      expect(result!.pages[1]!.id).toBe('page-2');
    });

    it('should return null when document not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getDocumentWithPages('nonexistent');
      expect(result).toBeNull();
      // getAll should not be called if document not found
      expect(mockGetAll).not.toHaveBeenCalled();
    });

    it('should return document with empty pages array when no pages', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow());
      mockGetAll.mockResolvedValueOnce([]);

      const result = await getDocumentWithPages('doc-1');
      expect(result!.pages).toEqual([]);
    });
  });

  // ── listDocuments ────────────────────────────────────────────────────

  describe('listDocuments', () => {
    it('should return all documents sorted by updated_at desc', async () => {
      mockGetAll.mockResolvedValueOnce([
        makeDocumentRow({ id: 'doc-2', updated_at: '2026-01-02T00:00:00Z' }),
        makeDocumentRow({ id: 'doc-1', updated_at: '2026-01-01T00:00:00Z' }),
      ]);

      const result = await listDocuments();

      expect(mockGetAll).toHaveBeenCalledWith('SELECT * FROM documents ORDER BY updated_at DESC');
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('doc-2');
    });

    it('should filter by status when provided', async () => {
      mockGetAll.mockResolvedValueOnce([makeDocumentRow({ status: 'scanned' })]);

      const result = await listDocuments('scanned');

      expect(mockGetAll).toHaveBeenCalledWith(
        'SELECT * FROM documents WHERE status = ? ORDER BY updated_at DESC',
        ['scanned'],
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no documents exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await listDocuments();
      expect(result).toEqual([]);
    });
  });

  // ── updateDocument ───────────────────────────────────────────────────

  describe('updateDocument', () => {
    it('should update title and return updated document', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ title: 'Updated Title' }));

      const result = await updateDocument('doc-1', {
        title: 'Updated Title',
      });

      expect(mockRunQuery).toHaveBeenCalledTimes(1);
      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('UPDATE documents SET');
      expect(sql).toContain('title = ?');
      expect(sql).toContain('updated_at = ?');

      expect(result).not.toBeNull();
    });

    it('should validate status transitions', async () => {
      // First call: getDocumentById to check current status
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ status: 'scanned' }));
      // Update query succeeds
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      // Second call: re-read the updated document
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ status: 'ocr_complete' }));

      const result = await updateDocument('doc-1', {
        status: 'ocr_complete',
      });

      // Should have made the update query
      expect(mockRunQuery).toHaveBeenCalled();
      // Should not throw because scanned → ocr_complete is valid
      expect(result).not.toBeNull();
      expect(result!.status).toBe('ocr_complete');
    });

    it('should reject invalid status transitions', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ status: 'scanned' }));

      await expect(updateDocument('doc-1', { status: 'exported' })).rejects.toThrow(QueryError);

      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ status: 'scanned' }));

      await expect(updateDocument('doc-1', { status: 'exported' })).rejects.toThrow(
        "Invalid status transition from 'scanned' to 'exported'",
      );
    });

    it('should return null when document not found for status update', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await updateDocument('nonexistent', {
        status: 'ocr_complete',
      });
      expect(result).toBeNull();
    });

    it('should return null when update affects no rows', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await updateDocument('nonexistent', {
        title: 'New Title',
      });
      expect(result).toBeNull();
    });

    it('should return current document when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow());

      const result = await updateDocument('doc-1', {});

      expect(mockRunQuery).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });

    it('should update multiple fields at once', async () => {
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ status: 'reviewed' }));
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(
        makeDocumentRow({
          status: 'exported',
          exported_pdf_uri: 'file:///pdf/doc-1.pdf',
        }),
      );

      const result = await updateDocument('doc-1', {
        status: 'exported',
        exportedPdfUri: 'file:///pdf/doc-1.pdf',
      });

      const [sql, params] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('status = ?');
      expect(sql).toContain('exported_pdf_uri = ?');
      expect(params).toContain('exported');
      expect(params).toContain('file:///pdf/doc-1.pdf');

      expect(result!.status).toBe('exported');
    });

    it('should update documentType', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow({ document_type: 'tax return' }));

      await updateDocument('doc-1', { documentType: 'tax return' });

      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('document_type = ?');
    });

    it('should always update the updated_at timestamp', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(makeDocumentRow());

      await updateDocument('doc-1', { title: 'New' });

      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('updated_at = ?');
    });
  });

  // ── deleteDocument ───────────────────────────────────────────────────

  describe('deleteDocument', () => {
    it('should delete the document and return true', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deleteDocument('doc-1');

      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM documents WHERE id = ?', ['doc-1']);
      expect(result).toBe(true);
    });

    it('should return false when document not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteDocument('nonexistent');
      expect(result).toBe(false);
    });

    it('should delete associated files by default', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      await deleteDocument('doc-1');

      expect(mockDeleteDocumentFiles).toHaveBeenCalledWith('doc-1');
    });

    it('should skip file deletion when deleteFiles is false', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      await deleteDocument('doc-1', false);

      expect(mockDeleteDocumentFiles).not.toHaveBeenCalled();
    });

    it('should not delete files when document was not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      await deleteDocument('nonexistent');

      expect(mockDeleteDocumentFiles).not.toHaveBeenCalled();
    });

    it('should not throw when file deletion fails', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockDeleteDocumentFiles.mockImplementationOnce(() => {
        throw new Error('filesystem error');
      });

      // Should not throw
      const result = await deleteDocument('doc-1');
      expect(result).toBe(true);
    });
  });

  // ── countDocuments ───────────────────────────────────────────────────

  describe('countDocuments', () => {
    it('should return total count without status filter', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 5 });

      const result = await countDocuments();

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM documents');
      expect(result).toBe(5);
    });

    it('should return filtered count with status', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 2 });

      const result = await countDocuments('scanned');

      expect(mockGetFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM documents WHERE status = ?',
        ['scanned'],
      );
      expect(result).toBe(2);
    });

    it('should return 0 when no rows match', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await countDocuments();
      expect(result).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Page CRUD
// ═══════════════════════════════════════════════════════════════════════════

describe('Page CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createPage ───────────────────────────────────────────────────────

  describe('createPage', () => {
    it('should insert a page and return the mapped result', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const input: CreatePageInput = {
        id: 'page-1',
        documentId: 'doc-1',
        pageNumber: 1,
        originalImageUri: 'file:///originals/page-1.jpg',
        width: 800,
        height: 1200,
      };

      const result = await createPage(input);

      expect(mockRunQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('INSERT INTO document_pages');
      expect(params[0]).toBe('page-1');
      expect(params[1]).toBe('doc-1');
      expect(params[2]).toBe(1);
      expect(params[3]).toBe('file:///originals/page-1.jpg');
      expect(params[4]).toBeNull(); // processedImageUri
      expect(params[5]).toBeNull(); // ocrText
      expect(params[6]).toBe(800);
      expect(params[7]).toBe(1200);

      expect(result.id).toBe('page-1');
      expect(result.documentId).toBe('doc-1');
      expect(result.pageNumber).toBe(1);
      expect(result.ocrText).toBe('');
      expect(result.width).toBe(800);
      expect(result.height).toBe(1200);
    });

    it('should handle all optional fields', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const result = await createPage({
        id: 'page-2',
        documentId: 'doc-1',
        pageNumber: 2,
        originalImageUri: 'file:///originals/page-2.jpg',
        processedImageUri: 'file:///processed/page-2-enhanced.jpg',
        ocrText: 'Name: John Doe',
        width: 640,
        height: 960,
      });

      expect(result.processedImageUri).toBe('file:///processed/page-2-enhanced.jpg');
      expect(result.ocrText).toBe('Name: John Doe');
    });

    it('should default optional fields appropriately', async () => {
      mockRunQuery.mockResolvedValueOnce({ lastInsertRowId: 1, changes: 1 });

      const result = await createPage({
        id: 'page-3',
        documentId: 'doc-1',
        pageNumber: 1,
        originalImageUri: 'file:///originals/page-3.jpg',
      });

      expect(result.processedImageUri).toBeUndefined();
      expect(result.ocrText).toBe('');
      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it('should propagate QueryError on insert failure', async () => {
      mockRunQuery.mockRejectedValueOnce(new QueryError('FOREIGN KEY constraint failed'));

      await expect(
        createPage({
          id: 'page-x',
          documentId: 'nonexistent-doc',
          pageNumber: 1,
          originalImageUri: 'file:///originals/page-x.jpg',
        }),
      ).rejects.toThrow(QueryError);
    });
  });

  // ── getPageById ──────────────────────────────────────────────────────

  describe('getPageById', () => {
    it('should return a mapped page when found', async () => {
      mockGetFirst.mockResolvedValueOnce(
        makePageRow({
          ocr_text: 'Hello World',
          width: 800,
          height: 1200,
        }),
      );

      const result = await getPageById('page-1');

      expect(mockGetFirst).toHaveBeenCalledWith('SELECT * FROM document_pages WHERE id = ?', [
        'page-1',
      ]);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('page-1');
      expect(result!.documentId).toBe('doc-1');
      expect(result!.ocrText).toBe('Hello World');
      expect(result!.width).toBe(800);
      expect(result!.height).toBe(1200);
    });

    it('should return null when page not found', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await getPageById('nonexistent');
      expect(result).toBeNull();
    });

    it('should map null ocr_text to empty string', async () => {
      mockGetFirst.mockResolvedValueOnce(makePageRow({ ocr_text: null }));

      const result = await getPageById('page-1');
      expect(result!.ocrText).toBe('');
    });

    it('should map null dimensions to 0', async () => {
      mockGetFirst.mockResolvedValueOnce(makePageRow({ width: null, height: null }));

      const result = await getPageById('page-1');
      expect(result!.width).toBe(0);
      expect(result!.height).toBe(0);
    });

    it('should map null processed_image_uri to undefined', async () => {
      mockGetFirst.mockResolvedValueOnce(makePageRow({ processed_image_uri: null }));

      const result = await getPageById('page-1');
      expect(result!.processedImageUri).toBeUndefined();
    });
  });

  // ── getPagesByDocumentId ─────────────────────────────────────────────

  describe('getPagesByDocumentId', () => {
    it('should return pages sorted by page_number', async () => {
      mockGetAll.mockResolvedValueOnce([
        makePageRow({ id: 'page-1', page_number: 1 }),
        makePageRow({ id: 'page-2', page_number: 2 }),
        makePageRow({ id: 'page-3', page_number: 3 }),
      ]);

      const result = await getPagesByDocumentId('doc-1');

      expect(mockGetAll).toHaveBeenCalledWith(
        'SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC',
        ['doc-1'],
      );
      expect(result).toHaveLength(3);
      expect(result[0]!.pageNumber).toBe(1);
      expect(result[2]!.pageNumber).toBe(3);
    });

    it('should return empty array when no pages exist', async () => {
      mockGetAll.mockResolvedValueOnce([]);

      const result = await getPagesByDocumentId('doc-empty');
      expect(result).toEqual([]);
    });
  });

  // ── updatePage ───────────────────────────────────────────────────────

  describe('updatePage', () => {
    it('should update OCR text', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(makePageRow({ ocr_text: 'Extracted text' }));

      const result = await updatePage('page-1', {
        ocrText: 'Extracted text',
      });

      const [sql, params] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('UPDATE document_pages SET');
      expect(sql).toContain('ocr_text = ?');
      expect(params).toContain('Extracted text');

      expect(result).not.toBeNull();
    });

    it('should update processed image URI', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(
        makePageRow({
          processed_image_uri: 'file:///processed/page-1-enhanced.jpg',
        }),
      );

      const result = await updatePage('page-1', {
        processedImageUri: 'file:///processed/page-1-enhanced.jpg',
      });

      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('processed_image_uri = ?');
      expect(result).not.toBeNull();
    });

    it('should update dimensions', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(makePageRow({ width: 1920, height: 2560 }));

      const result = await updatePage('page-1', {
        width: 1920,
        height: 2560,
      });

      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('width = ?');
      expect(sql).toContain('height = ?');
      expect(result!.width).toBe(1920);
      expect(result!.height).toBe(2560);
    });

    it('should update multiple fields at once', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockGetFirst.mockResolvedValueOnce(
        makePageRow({
          ocr_text: 'Text',
          processed_image_uri: 'file:///processed/page-1.jpg',
          width: 800,
          height: 1200,
        }),
      );

      await updatePage('page-1', {
        ocrText: 'Text',
        processedImageUri: 'file:///processed/page-1.jpg',
        width: 800,
        height: 1200,
      });

      const [sql] = mockRunQuery.mock.calls[0]!;
      expect(sql).toContain('ocr_text = ?');
      expect(sql).toContain('processed_image_uri = ?');
      expect(sql).toContain('width = ?');
      expect(sql).toContain('height = ?');
    });

    it('should return null when page not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await updatePage('nonexistent', {
        ocrText: 'Text',
      });
      expect(result).toBeNull();
    });

    it('should return current page when no fields to update', async () => {
      mockGetFirst.mockResolvedValueOnce(makePageRow());

      const result = await updatePage('page-1', {});

      expect(mockRunQuery).not.toHaveBeenCalled();
      expect(result).not.toBeNull();
    });
  });

  // ── deletePage ───────────────────────────────────────────────────────

  describe('deletePage', () => {
    it('should delete the page and return true', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deletePage('page-1');

      expect(mockRunQuery).toHaveBeenCalledWith('DELETE FROM document_pages WHERE id = ?', [
        'page-1',
      ]);
      expect(result).toBe(true);
    });

    it('should return false when page not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deletePage('nonexistent');
      expect(result).toBe(false);
    });
  });

  // ── deletePagesByDocumentId ──────────────────────────────────────────

  describe('deletePagesByDocumentId', () => {
    it('should delete all pages for a document and return count', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 3 });

      const result = await deletePagesByDocumentId('doc-1');

      expect(mockRunQuery).toHaveBeenCalledWith(
        'DELETE FROM document_pages WHERE document_id = ?',
        ['doc-1'],
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no pages exist', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deletePagesByDocumentId('doc-empty');
      expect(result).toBe(0);
    });
  });

  // ── countPages ───────────────────────────────────────────────────────

  describe('countPages', () => {
    it('should return the page count for a document', async () => {
      mockGetFirst.mockResolvedValueOnce({ count: 4 });

      const result = await countPages('doc-1');

      expect(mockGetFirst).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM document_pages WHERE document_id = ?',
        ['doc-1'],
      );
      expect(result).toBe(4);
    });

    it('should return 0 when no pages exist', async () => {
      mockGetFirst.mockResolvedValueOnce(null);

      const result = await countPages('doc-empty');
      expect(result).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Composite Operations
// ═══════════════════════════════════════════════════════════════════════════

describe('Composite Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createDocumentWithPages ──────────────────────────────────────────

  describe('createDocumentWithPages', () => {
    it('should create document and pages in a transaction', async () => {
      mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const docInput: CreateDocumentInput = {
        id: 'doc-1',
        title: 'Scanned Form',
        sourceType: 'camera',
      };

      const pageInputs: CreatePageInput[] = [
        {
          id: 'page-1',
          documentId: 'doc-1',
          pageNumber: 1,
          originalImageUri: 'file:///originals/page-1.jpg',
        },
        {
          id: 'page-2',
          documentId: 'doc-1',
          pageNumber: 2,
          originalImageUri: 'file:///originals/page-2.jpg',
        },
      ];

      const result = await createDocumentWithPages(docInput, pageInputs);

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(result.id).toBe('doc-1');
      expect(result.pages).toHaveLength(2);
      expect(result.pages[0]!.pageNumber).toBe(1);
      expect(result.pages[1]!.pageNumber).toBe(2);
    });

    it('should set documentId on pages from the document input', async () => {
      mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const result = await createDocumentWithPages({ id: 'doc-1', sourceType: 'import' }, [
        {
          id: 'page-1',
          documentId: 'ignored', // should be overridden
          pageNumber: 1,
          originalImageUri: 'file:///originals/page-1.jpg',
        },
      ]);

      expect(result.pages[0]!.documentId).toBe('doc-1');
    });

    it('should work with zero pages', async () => {
      mockRunQuery.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });

      const result = await createDocumentWithPages({ id: 'doc-1', sourceType: 'camera' }, []);

      expect(result.pages).toEqual([]);
    });
  });

  // ── deleteDocumentWithCleanup ────────────────────────────────────────

  describe('deleteDocumentWithCleanup', () => {
    it('should delete document in transaction and clean up files', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });

      const result = await deleteDocumentWithCleanup('doc-1');

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(mockDeleteDocumentFiles).toHaveBeenCalledWith('doc-1');
      expect(result).toBe(true);
    });

    it('should return false when document not found', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 0 });

      const result = await deleteDocumentWithCleanup('nonexistent');

      expect(result).toBe(false);
      expect(mockDeleteDocumentFiles).not.toHaveBeenCalled();
    });

    it('should not throw when file cleanup fails', async () => {
      mockRunQuery.mockResolvedValueOnce({ changes: 1 });
      mockDeleteDocumentFiles.mockImplementationOnce(() => {
        throw new Error('disk error');
      });

      const result = await deleteDocumentWithCleanup('doc-1');
      expect(result).toBe(true);
    });
  });
});
