/**
 * Document & Page CRUD Operations
 *
 * Provides type-safe create, read, update, and delete operations for
 * documents and document pages in the local SQLite database.
 * Coordinates with fileStorage for image file references on delete.
 *
 * Uses the database query helpers from database.ts for consistent
 * error handling and transaction support.
 */

import type {
  DocumentPage,
  DocumentSourceType,
  ProcessedDocument,
  ProcessingStatus,
} from '@fillit/shared';

import { getAll, getFirst, runQuery, withTransaction } from './database';
import { QueryError } from './databaseErrors';
import { deleteDocumentFiles } from './fileStorage';

// ─── DB Row Types ──────────────────────────────────────────────────────

/** Raw row shape returned by SQLite for the documents table. */
interface DocumentRow {
  id: string;
  title: string | null;
  status: string;
  source_type: string;
  document_type: string | null;
  created_at: string;
  updated_at: string;
  exported_pdf_uri: string | null;
}

/** Raw row shape returned by SQLite for the document_pages table. */
interface PageRow {
  id: string;
  document_id: string;
  page_number: number;
  original_image_uri: string;
  processed_image_uri: string | null;
  ocr_text: string | null;
  width: number | null;
  height: number | null;
}

// ─── Input Types ───────────────────────────────────────────────────────

/** Input for creating a new document. */
export interface CreateDocumentInput {
  id: string;
  title?: string;
  sourceType: DocumentSourceType;
  documentType?: string;
}

/** Input for updating an existing document. */
export interface UpdateDocumentInput {
  title?: string;
  status?: ProcessingStatus;
  documentType?: string;
  exportedPdfUri?: string;
}

/** Input for creating a new page. */
export interface CreatePageInput {
  id: string;
  documentId: string;
  pageNumber: number;
  originalImageUri: string;
  processedImageUri?: string;
  ocrText?: string;
  width?: number;
  height?: number;
}

/** Input for updating an existing page. */
export interface UpdatePageInput {
  processedImageUri?: string;
  ocrText?: string;
  width?: number;
  height?: number;
}

// ─── Valid Status Transitions ──────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<ProcessingStatus, ProcessingStatus[]> = {
  scanned: ['ocr_complete'],
  ocr_complete: ['fields_detected'],
  fields_detected: ['matched'],
  matched: ['reviewed'],
  reviewed: ['exported'],
  exported: [],
};

/**
 * Check whether a status transition is valid.
 *
 * Status must progress linearly through the pipeline:
 * scanned → ocr_complete → fields_detected → matched → reviewed → exported
 */
export function isValidStatusTransition(from: ProcessingStatus, to: ProcessingStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Row Mapping ───────────────────────────────────────────────────────

/** Convert a database row to a ProcessedDocument (without pages/fields). */
function mapDocumentRow(row: DocumentRow): ProcessedDocument {
  return {
    id: row.id,
    title: row.title ?? '',
    pages: [],
    fields: [],
    status: row.status as ProcessingStatus,
    sourceType: row.source_type as DocumentSourceType,
    documentType: row.document_type ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exportedPdfUri: row.exported_pdf_uri ?? undefined,
  };
}

/** Convert a database row to a DocumentPage. */
function mapPageRow(row: PageRow): DocumentPage {
  return {
    id: row.id,
    documentId: row.document_id,
    pageNumber: row.page_number,
    originalImageUri: row.original_image_uri,
    processedImageUri: row.processed_image_uri ?? undefined,
    ocrText: row.ocr_text ?? '',
    width: row.width ?? 0,
    height: row.height ?? 0,
  };
}

// ─── Document CRUD ─────────────────────────────────────────────────────

/**
 * Create a new document.
 *
 * Initializes the document with 'scanned' status and current timestamps.
 *
 * @param input - The document data to insert.
 * @returns The newly created document.
 * @throws {QueryError} If the insert fails (e.g., duplicate ID).
 */
export async function createDocument(input: CreateDocumentInput): Promise<ProcessedDocument> {
  const now = new Date().toISOString();

  await runQuery(
    `INSERT INTO documents (id, title, status, source_type, document_type, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.title ?? null,
      'scanned' as ProcessingStatus,
      input.sourceType,
      input.documentType ?? null,
      now,
      now,
    ],
  );

  return {
    id: input.id,
    title: input.title ?? '',
    pages: [],
    fields: [],
    status: 'scanned',
    sourceType: input.sourceType,
    documentType: input.documentType,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get a document by ID.
 *
 * Returns the document without pages or fields populated.
 * Use {@link getDocumentWithPages} to include pages.
 *
 * @param id - The document UUID.
 * @returns The document, or `null` if not found.
 */
export async function getDocumentById(id: string): Promise<ProcessedDocument | null> {
  const row = await getFirst<DocumentRow>('SELECT * FROM documents WHERE id = ?', [id]);
  return row ? mapDocumentRow(row) : null;
}

/**
 * Get a document by ID with its pages populated.
 *
 * Pages are sorted by page_number ascending.
 *
 * @param id - The document UUID.
 * @returns The document with pages, or `null` if not found.
 */
export async function getDocumentWithPages(id: string): Promise<ProcessedDocument | null> {
  const doc = await getDocumentById(id);
  if (!doc) return null;

  const pages = await getPagesByDocumentId(id);
  return { ...doc, pages };
}

/**
 * List all documents, optionally filtered by status.
 *
 * Results are sorted by updated_at descending (most recent first).
 *
 * @param status - Optional status filter.
 * @returns Array of documents (without pages/fields populated).
 */
export async function listDocuments(status?: ProcessingStatus): Promise<ProcessedDocument[]> {
  let rows: DocumentRow[];

  if (status) {
    rows = await getAll<DocumentRow>(
      'SELECT * FROM documents WHERE status = ? ORDER BY updated_at DESC',
      [status],
    );
  } else {
    rows = await getAll<DocumentRow>('SELECT * FROM documents ORDER BY updated_at DESC');
  }

  return rows.map(mapDocumentRow);
}

/**
 * Update a document's metadata and/or status.
 *
 * If a status change is requested, it must be a valid pipeline transition.
 * The updated_at timestamp is always set to the current time.
 *
 * @param id - The document UUID.
 * @param input - The fields to update.
 * @returns The updated document, or `null` if not found.
 * @throws {QueryError} If the status transition is invalid.
 */
export async function updateDocument(
  id: string,
  input: UpdateDocumentInput,
): Promise<ProcessedDocument | null> {
  // Validate status transition if status is being changed
  if (input.status) {
    const current = await getDocumentById(id);
    if (!current) return null;

    if (!isValidStatusTransition(current.status, input.status)) {
      throw new QueryError(
        `Invalid status transition from '${current.status}' to '${input.status}'`,
      );
    }
  }

  const setClauses: string[] = [];
  const params: (string | null)[] = [];

  if (input.title !== undefined) {
    setClauses.push('title = ?');
    params.push(input.title);
  }
  if (input.status !== undefined) {
    setClauses.push('status = ?');
    params.push(input.status);
  }
  if (input.documentType !== undefined) {
    setClauses.push('document_type = ?');
    params.push(input.documentType);
  }
  if (input.exportedPdfUri !== undefined) {
    setClauses.push('exported_pdf_uri = ?');
    params.push(input.exportedPdfUri);
  }

  if (setClauses.length === 0) {
    // Nothing to update, just return the current document
    return getDocumentById(id);
  }

  // Always update the updated_at timestamp
  setClauses.push('updated_at = ?');
  params.push(new Date().toISOString());

  // Add the WHERE clause param
  params.push(id);

  const result = await runQuery(
    `UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );

  if (result.changes === 0) {
    return null;
  }

  return getDocumentById(id);
}

/**
 * Delete a document and all associated pages.
 *
 * Also deletes associated files from the filesystem via fileStorage.
 * The cascade on document_pages and detected_fields is handled by SQLite
 * foreign key constraints (ON DELETE CASCADE).
 *
 * @param id - The document UUID.
 * @param deleteFiles - Whether to also delete associated files. Defaults to true.
 * @returns `true` if the document was deleted, `false` if not found.
 */
export async function deleteDocument(id: string, deleteFiles = true): Promise<boolean> {
  const result = await runQuery('DELETE FROM documents WHERE id = ?', [id]);

  if (result.changes > 0 && deleteFiles) {
    try {
      deleteDocumentFiles(id);
    } catch {
      // File deletion failure should not fail the DB operation.
      // Orphaned files can be cleaned up separately.
    }
  }

  return result.changes > 0;
}

/**
 * Count documents, optionally filtered by status.
 *
 * @param status - Optional status filter.
 * @returns The number of matching documents.
 */
export async function countDocuments(status?: ProcessingStatus): Promise<number> {
  if (status) {
    const row = await getFirst<{ count: number }>(
      'SELECT COUNT(*) as count FROM documents WHERE status = ?',
      [status],
    );
    return row?.count ?? 0;
  }

  const row = await getFirst<{ count: number }>('SELECT COUNT(*) as count FROM documents');
  return row?.count ?? 0;
}

// ─── Page CRUD ─────────────────────────────────────────────────────────

/**
 * Create a new page linked to a document.
 *
 * @param input - The page data to insert.
 * @returns The newly created page.
 * @throws {QueryError} If the insert fails (e.g., document does not exist).
 */
export async function createPage(input: CreatePageInput): Promise<DocumentPage> {
  await runQuery(
    `INSERT INTO document_pages (id, document_id, page_number, original_image_uri, processed_image_uri, ocr_text, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.id,
      input.documentId,
      input.pageNumber,
      input.originalImageUri,
      input.processedImageUri ?? null,
      input.ocrText ?? null,
      input.width ?? null,
      input.height ?? null,
    ],
  );

  return {
    id: input.id,
    documentId: input.documentId,
    pageNumber: input.pageNumber,
    originalImageUri: input.originalImageUri,
    processedImageUri: input.processedImageUri,
    ocrText: input.ocrText ?? '',
    width: input.width ?? 0,
    height: input.height ?? 0,
  };
}

/**
 * Get a page by ID.
 *
 * @param id - The page UUID.
 * @returns The page, or `null` if not found.
 */
export async function getPageById(id: string): Promise<DocumentPage | null> {
  const row = await getFirst<PageRow>('SELECT * FROM document_pages WHERE id = ?', [id]);
  return row ? mapPageRow(row) : null;
}

/**
 * Get all pages for a document, sorted by page number.
 *
 * @param documentId - The document UUID.
 * @returns Array of pages sorted by page_number ascending.
 */
export async function getPagesByDocumentId(documentId: string): Promise<DocumentPage[]> {
  const rows = await getAll<PageRow>(
    'SELECT * FROM document_pages WHERE document_id = ? ORDER BY page_number ASC',
    [documentId],
  );
  return rows.map(mapPageRow);
}

/**
 * Update a page's OCR text, processed image, or dimensions.
 *
 * @param id - The page UUID.
 * @param input - The fields to update.
 * @returns The updated page, or `null` if not found.
 */
export async function updatePage(id: string, input: UpdatePageInput): Promise<DocumentPage | null> {
  const setClauses: string[] = [];
  const params: (string | number | null)[] = [];

  if (input.processedImageUri !== undefined) {
    setClauses.push('processed_image_uri = ?');
    params.push(input.processedImageUri);
  }
  if (input.ocrText !== undefined) {
    setClauses.push('ocr_text = ?');
    params.push(input.ocrText);
  }
  if (input.width !== undefined) {
    setClauses.push('width = ?');
    params.push(input.width);
  }
  if (input.height !== undefined) {
    setClauses.push('height = ?');
    params.push(input.height);
  }

  if (setClauses.length === 0) {
    return getPageById(id);
  }

  params.push(id);

  const result = await runQuery(
    `UPDATE document_pages SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
  );

  if (result.changes === 0) {
    return null;
  }

  return getPageById(id);
}

/**
 * Delete a page by ID.
 *
 * @param id - The page UUID.
 * @returns `true` if the page was deleted, `false` if not found.
 */
export async function deletePage(id: string): Promise<boolean> {
  const result = await runQuery('DELETE FROM document_pages WHERE id = ?', [id]);
  return result.changes > 0;
}

/**
 * Delete all pages for a document.
 *
 * @param documentId - The document UUID.
 * @returns The number of pages deleted.
 */
export async function deletePagesByDocumentId(documentId: string): Promise<number> {
  const result = await runQuery('DELETE FROM document_pages WHERE document_id = ?', [documentId]);
  return result.changes;
}

/**
 * Count pages for a document.
 *
 * @param documentId - The document UUID.
 * @returns The number of pages.
 */
export async function countPages(documentId: string): Promise<number> {
  const row = await getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM document_pages WHERE document_id = ?',
    [documentId],
  );
  return row?.count ?? 0;
}

// ─── Composite Operations ──────────────────────────────────────────────

/**
 * Create a document with its pages in a single transaction.
 *
 * All inserts happen atomically — if any page insert fails, the entire
 * operation is rolled back.
 *
 * @param documentInput - The document data.
 * @param pageInputs - Array of page data to insert.
 * @returns The created document with pages populated.
 */
export async function createDocumentWithPages(
  documentInput: CreateDocumentInput,
  pageInputs: CreatePageInput[],
): Promise<ProcessedDocument> {
  let document: ProcessedDocument | undefined;
  const pages: DocumentPage[] = [];

  await withTransaction(async () => {
    document = await createDocument(documentInput);
    for (const pageInput of pageInputs) {
      const page = await createPage({
        ...pageInput,
        documentId: documentInput.id,
      });
      pages.push(page);
    }
  });

  return { ...document!, pages };
}

/**
 * Delete a document and all its pages, cleaning up files in a single operation.
 *
 * Deletes the database rows within a transaction, then cleans up files.
 *
 * @param id - The document UUID.
 * @returns `true` if the document was deleted, `false` if not found.
 */
export async function deleteDocumentWithCleanup(id: string): Promise<boolean> {
  let deleted = false;

  await withTransaction(async () => {
    const result = await runQuery('DELETE FROM documents WHERE id = ?', [id]);
    deleted = result.changes > 0;
  });

  if (deleted) {
    try {
      deleteDocumentFiles(id);
    } catch {
      // File cleanup failure is non-fatal
    }
  }

  return deleted;
}
