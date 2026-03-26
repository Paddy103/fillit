/**
 * Document Zustand store backed by SQLite.
 *
 * Manages processed documents with pages and detected fields. All mutations
 * sync to the SQLite database via the document CRUD layer — no AsyncStorage
 * persistence needed. Tracks document processing pipeline status reactively.
 */

import type {
  DetectedField,
  DocumentPage,
  ProcessedDocument,
  ProcessingStatus,
} from '@fillit/shared';
import { create } from 'zustand';

import {
  createDocument,
  createPage,
  deleteDocument,
  deletePage,
  getDocumentWithPages,
  getPagesByDocumentId,
  listDocuments,
  updateDocument,
  updatePage,
  type CreateDocumentInput,
  type CreatePageInput,
  type UpdateDocumentInput,
  type UpdatePageInput,
} from '../services/storage/documentCrud';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** State managed by the document store */
export interface DocumentState {
  /** All loaded documents */
  documents: ProcessedDocument[];
  /** The currently active/selected document ID */
  currentDocumentId: string | null;
  /** Whether documents are being loaded from the database */
  isLoading: boolean;
  /** Number of in-flight mutations (derived: isMutating = mutationCount > 0) */
  mutationCount: number;
  /** Whether the store has been initialized from the database */
  isInitialized: boolean;
  /** Last error that occurred, null if no error */
  error: DocumentStoreError | null;
}

/** Structured error for the document store */
export interface DocumentStoreError {
  /** Which operation failed */
  operation: DocumentOperation;
  /** Human-readable message */
  message: string;
  /** Original error, if any */
  cause?: unknown;
}

/** Operations that can fail in the document store */
export type DocumentOperation =
  | 'load'
  | 'create'
  | 'update'
  | 'delete'
  | 'createPage'
  | 'updatePage'
  | 'deletePage'
  | 'updateStatus'
  | 'setFields';

/** Actions available on the document store */
export interface DocumentActions {
  initialize: () => Promise<void>;
  setCurrentDocumentId: (id: string | null) => void;
  createDocument: (input: CreateDocumentInput) => Promise<ProcessedDocument>;
  updateDocument: (id: string, input: UpdateDocumentInput) => Promise<ProcessedDocument | null>;
  deleteDocument: (id: string) => Promise<boolean>;
  createPage: (input: CreatePageInput) => Promise<DocumentPage>;
  updatePage: (
    id: string,
    input: UpdatePageInput,
    documentId: string,
  ) => Promise<DocumentPage | null>;
  deletePage: (id: string, documentId: string) => Promise<boolean>;
  updateStatus: (id: string, status: ProcessingStatus) => Promise<ProcessedDocument | null>;
  setFields: (documentId: string, fields: DetectedField[]) => void;
  clearError: () => void;
  reset: () => void;
}

export type DocumentStore = DocumentState & DocumentActions;

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_DOCUMENT_STATE: DocumentState = {
  documents: [],
  currentDocumentId: null,
  isLoading: false,
  mutationCount: 0,
  isInitialized: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SetFn = {
  (partial: Partial<DocumentStore> | ((state: DocumentStore) => Partial<DocumentStore>)): void;
};
type GetFn = () => DocumentStore;

function toStoreError(operation: DocumentOperation, err: unknown): DocumentStoreError {
  return {
    operation,
    message: err instanceof Error ? err.message : String(err),
    cause: err,
  };
}

function replaceDocument(
  documents: ProcessedDocument[],
  updated: ProcessedDocument,
): ProcessedDocument[] {
  return documents.map((d) => (d.id === updated.id ? updated : d));
}

// ---------------------------------------------------------------------------
// Action factories — each returns a slice of the store actions
// ---------------------------------------------------------------------------

function createMutationHelpers(set: SetFn) {
  const startMutation = () => set((s) => ({ mutationCount: s.mutationCount + 1, error: null }));
  const endMutation = () => set((s) => ({ mutationCount: s.mutationCount - 1 }));
  const endMutationWithError = (op: DocumentOperation, err: unknown) =>
    set((s) => ({
      mutationCount: s.mutationCount - 1,
      error: toStoreError(op, err),
    }));
  const updateDocumentChildren = (
    documentId: string,
    updater: (doc: ProcessedDocument) => Partial<ProcessedDocument>,
  ) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === documentId ? { ...d, ...updater(d) } : d)),
      mutationCount: s.mutationCount - 1,
    }));

  return {
    startMutation,
    endMutation,
    endMutationWithError,
    updateDocumentChildren,
  };
}

function createInitActions(set: SetFn, get: GetFn) {
  return {
    initialize: async () => {
      const { isInitialized, isLoading } = get();
      if (isInitialized || isLoading) return;

      set({ isLoading: true, error: null });
      try {
        const docs = await listDocuments();
        const docsWithPages = await Promise.all(
          docs.map(async (doc) => {
            const full = await getDocumentWithPages(doc.id);
            return full ?? doc;
          }),
        );
        set({
          documents: docsWithPages,
          isLoading: false,
          isInitialized: true,
        });
      } catch (err) {
        set({ isLoading: false, error: toStoreError('load', err) });
      }
    },

    setCurrentDocumentId: (id: string | null) => {
      set({ currentDocumentId: id });
    },
  };
}

function createDocumentCrudActions(
  set: SetFn,
  { startMutation, endMutation, endMutationWithError }: ReturnType<typeof createMutationHelpers>,
) {
  return {
    createDocument: async (input: CreateDocumentInput) => {
      startMutation();
      try {
        const doc = await createDocument(input);
        set((s) => ({
          documents: [...s.documents, doc],
          currentDocumentId: doc.id,
          mutationCount: s.mutationCount - 1,
        }));
        return doc;
      } catch (err) {
        endMutationWithError('create', err);
        throw err;
      }
    },

    updateDocument: async (id: string, input: UpdateDocumentInput) => {
      startMutation();
      try {
        const updated = await updateDocument(id, input);
        if (updated) {
          set((s) => ({
            documents: replaceDocument(s.documents, {
              ...updated,
              pages: s.documents.find((d) => d.id === id)?.pages ?? updated.pages,
              fields: s.documents.find((d) => d.id === id)?.fields ?? updated.fields,
            }),
            mutationCount: s.mutationCount - 1,
          }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('update', err);
        throw err;
      }
    },

    deleteDocument: async (id: string) => {
      startMutation();
      try {
        const success = await deleteDocument(id);
        if (success) {
          set((s) => {
            const remaining = s.documents.filter((d) => d.id !== id);
            return {
              documents: remaining,
              currentDocumentId: s.currentDocumentId === id ? null : s.currentDocumentId,
              mutationCount: s.mutationCount - 1,
            };
          });
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('delete', err);
        throw err;
      }
    },
  };
}

function createPageActions({
  startMutation,
  endMutation,
  endMutationWithError,
  updateDocumentChildren,
}: ReturnType<typeof createMutationHelpers>) {
  return {
    createPage: async (input: CreatePageInput) => {
      startMutation();
      try {
        const page = await createPage(input);
        const pages = await getPagesByDocumentId(input.documentId);
        updateDocumentChildren(input.documentId, () => ({ pages }));
        return page;
      } catch (err) {
        endMutationWithError('createPage', err);
        throw err;
      }
    },

    updatePage: async (id: string, input: UpdatePageInput, documentId: string) => {
      startMutation();
      try {
        const updated = await updatePage(id, input);
        if (updated) {
          const pages = await getPagesByDocumentId(documentId);
          updateDocumentChildren(documentId, () => ({ pages }));
        } else {
          endMutation();
        }
        return updated;
      } catch (err) {
        endMutationWithError('updatePage', err);
        throw err;
      }
    },

    deletePage: async (id: string, documentId: string) => {
      startMutation();
      try {
        const success = await deletePage(id);
        if (success) {
          updateDocumentChildren(documentId, (d) => ({
            pages: d.pages.filter((p: DocumentPage) => p.id !== id),
          }));
        } else {
          endMutation();
        }
        return success;
      } catch (err) {
        endMutationWithError('deletePage', err);
        throw err;
      }
    },
  };
}

function createProcessingActions(
  set: SetFn,
  { startMutation, endMutationWithError }: ReturnType<typeof createMutationHelpers>,
) {
  return {
    updateStatus: async (id: string, status: ProcessingStatus) => {
      startMutation();
      try {
        const updated = await updateDocument(id, { status });
        if (updated) {
          set((s) => ({
            documents: s.documents.map((d) =>
              d.id === id ? { ...d, status: updated.status, updatedAt: updated.updatedAt } : d,
            ),
            mutationCount: s.mutationCount - 1,
          }));
        } else {
          set((s) => ({ mutationCount: s.mutationCount - 1 }));
        }
        return updated;
      } catch (err) {
        endMutationWithError('updateStatus', err);
        throw err;
      }
    },

    setFields: (documentId: string, fields: DetectedField[]) => {
      set((s) => ({
        documents: s.documents.map((d) => (d.id === documentId ? { ...d, fields } : d)),
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useDocumentStore = create<DocumentStore>()(createDocumentStore);

function createDocumentStore(set: SetFn, get: GetFn): DocumentStore {
  const mutationHelpers = createMutationHelpers(set);

  return {
    ...DEFAULT_DOCUMENT_STATE,
    ...createInitActions(set, get),
    ...createDocumentCrudActions(set, mutationHelpers),
    ...createPageActions(mutationHelpers),
    ...createProcessingActions(set, mutationHelpers),
    clearError: () => set({ error: null }),
    reset: () => set({ ...DEFAULT_DOCUMENT_STATE }),
  };
}

// ---------------------------------------------------------------------------
// Typed selectors
// ---------------------------------------------------------------------------

/** Select all documents */
export const selectDocuments = (state: DocumentStore): ProcessedDocument[] => state.documents;

/** Select the current document ID */
export const selectCurrentDocumentId = (state: DocumentStore): string | null =>
  state.currentDocumentId;

/** Select the currently active document */
export const selectCurrentDocument = (state: DocumentStore): ProcessedDocument | null =>
  state.documents.find((d) => d.id === state.currentDocumentId) ?? null;

/** Select documents filtered by processing status */
export const selectDocumentsByStatus =
  (status: ProcessingStatus) =>
  (state: DocumentStore): ProcessedDocument[] =>
    state.documents.filter((d) => d.status === status);

/** Select documents sorted by a given field and order */
export const selectDocumentsSorted =
  (sortBy: 'createdAt' | 'updatedAt' | 'title', order: 'asc' | 'desc') =>
  (state: DocumentStore): ProcessedDocument[] => {
    const sorted = [...state.documents].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
    return order === 'desc' ? sorted.reverse() : sorted;
  };

/** Select the total number of documents */
export const selectDocumentCount = (state: DocumentStore): number => state.documents.length;

/** Select a document by ID */
export const selectDocumentById =
  (id: string) =>
  (state: DocumentStore): ProcessedDocument | null =>
    state.documents.find((d) => d.id === id) ?? null;

/** Select pages for the current document */
export const selectCurrentDocumentPages = (state: DocumentStore): DocumentPage[] =>
  state.documents.find((d) => d.id === state.currentDocumentId)?.pages ?? [];

/** Select fields for the current document */
export const selectCurrentDocumentFields = (state: DocumentStore): DetectedField[] =>
  state.documents.find((d) => d.id === state.currentDocumentId)?.fields ?? [];

/** Select whether documents are loading */
export const selectIsLoading = (state: DocumentStore): boolean => state.isLoading;

/** Select whether any mutation is in progress */
export const selectIsMutating = (state: DocumentStore): boolean => state.mutationCount > 0;

/** Select whether the store has been initialized */
export const selectIsInitialized = (state: DocumentStore): boolean => state.isInitialized;

/** Select the current error */
export const selectError = (state: DocumentStore): DocumentStoreError | null => state.error;
