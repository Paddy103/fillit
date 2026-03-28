/**
 * Hook: useScanReview
 *
 * Manages the scan review screen logic:
 *   - Load document and pages from the store
 *   - Reorder pages (move up/down)
 *   - Delete a page
 *   - Retake a page (re-scan single page, replace image)
 *   - Confirm and advance pipeline to OCR
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import type { DocumentPage } from '@fillit/shared';
import { scanDocument } from '../services/scanner/documentScanner';
import { saveFile, deleteFile } from '../services/storage/fileStorage';
import { useDocumentStore, selectDocumentById } from '../stores/document-store';
import { useProcessingStore } from '../stores/processing-store';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseScanReviewOptions {
  documentId: string;
  onConfirm?: (documentId: string) => void;
}

export interface UseScanReviewReturn {
  /** The pages in display order. */
  pages: DocumentPage[];
  /** Whether any async operation is in progress. */
  isBusy: boolean;
  /** Move a page up in the order. */
  movePageUp: (pageId: string) => Promise<void>;
  /** Move a page down in the order. */
  movePageDown: (pageId: string) => Promise<void>;
  /** Delete a page from the document. */
  removePage: (pageId: string) => void;
  /** Retake a page using the scanner. */
  retakePage: (pageId: string) => Promise<void>;
  /** Confirm review and advance to OCR stage. */
  confirm: () => void;
  /** Whether confirm is possible (has at least one page). */
  canConfirm: boolean;
}

export function useScanReview({
  documentId,
  onConfirm,
}: UseScanReviewOptions): UseScanReviewReturn {
  const [isBusy, setIsBusy] = useState(false);
  const isBusyRef = useRef(false);

  const selector = useMemo(() => selectDocumentById(documentId), [documentId]);
  const document = useDocumentStore(selector);
  const updatePage = useDocumentStore((s) => s.updatePage);
  const deletePage = useDocumentStore((s) => s.deletePage);
  const completeCurrentStage = useProcessingStore((s) => s.completeCurrentStage);
  const advanceStage = useProcessingStore((s) => s.advanceStage);

  const pages = document?.pages
    ? [...document.pages].sort((a, b) => a.pageNumber - b.pageNumber)
    : [];

  const setBusy = (busy: boolean) => {
    isBusyRef.current = busy;
    setIsBusy(busy);
  };

  const movePageUp = useCallback(
    async (pageId: string) => {
      if (isBusyRef.current) return;
      const idx = pages.findIndex((p) => p.id === pageId);
      if (idx <= 0) return;

      setBusy(true);
      try {
        const current = pages[idx]!;
        const above = pages[idx - 1]!;
        await updatePage(current.id, { pageNumber: above.pageNumber }, documentId);
        await updatePage(above.id, { pageNumber: current.pageNumber }, documentId);
      } catch {
        Alert.alert('Error', 'Failed to reorder pages.');
      } finally {
        setBusy(false);
      }
    },
    [pages, updatePage, documentId],
  );

  const movePageDown = useCallback(
    async (pageId: string) => {
      if (isBusyRef.current) return;
      const idx = pages.findIndex((p) => p.id === pageId);
      if (idx < 0 || idx >= pages.length - 1) return;

      setBusy(true);
      try {
        const current = pages[idx]!;
        const below = pages[idx + 1]!;
        await updatePage(current.id, { pageNumber: below.pageNumber }, documentId);
        await updatePage(below.id, { pageNumber: current.pageNumber }, documentId);
      } catch {
        Alert.alert('Error', 'Failed to reorder pages.');
      } finally {
        setBusy(false);
      }
    },
    [pages, updatePage, documentId],
  );

  const removePage = useCallback(
    (pageId: string) => {
      if (isBusyRef.current) return;
      if (pages.length <= 1) {
        Alert.alert('Cannot Delete', 'A document must have at least one page.');
        return;
      }

      Alert.alert('Delete Page', 'Are you sure you want to delete this page?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const page = pages.find((p) => p.id === pageId);
              if (page) {
                await deletePage(pageId, documentId);
                // Delete the image file
                try {
                  deleteFile(page.originalImageUri);
                } catch {
                  // File cleanup is non-fatal
                }
                // Renumber remaining pages
                const remaining = pages.filter((p) => p.id !== pageId);
                for (let i = 0; i < remaining.length; i++) {
                  const p = remaining[i]!;
                  if (p.pageNumber !== i + 1) {
                    await updatePage(p.id, { pageNumber: i + 1 }, documentId);
                  }
                }
              }
            } catch {
              Alert.alert('Error', 'Failed to delete page.');
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
    },
    [pages, deletePage, updatePage, documentId],
  );

  const retakePage = useCallback(
    async (pageId: string) => {
      if (isBusyRef.current) return;

      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      setBusy(true);
      try {
        const result = await scanDocument({ pageLimit: 1 });

        if (result.status === 'canceled') {
          return;
        }

        if (result.status === 'error') {
          Alert.alert('Scan Failed', result.error.message);
          return;
        }

        const newImageUri = result.data.pages[0];
        if (!newImageUri) return;

        // Save the new image, overwriting the old one
        const filename = `page-${page.pageNumber}.jpg`;
        const savedUri = saveFile(documentId, 'originals', filename, newImageUri);

        // Update page record with new image URI
        await updatePage(page.id, { originalImageUri: savedUri }, documentId);
      } catch {
        Alert.alert('Error', 'Failed to retake page.');
      } finally {
        setBusy(false);
      }
    },
    [pages, updatePage, documentId],
  );

  const confirm = useCallback(() => {
    if (pages.length === 0) return;
    completeCurrentStage();
    advanceStage();
    onConfirm?.(documentId);
  }, [pages.length, completeCurrentStage, advanceStage, onConfirm, documentId]);

  return {
    pages,
    isBusy,
    movePageUp,
    movePageDown,
    removePage,
    retakePage,
    confirm,
    canConfirm: pages.length > 0,
  };
}
