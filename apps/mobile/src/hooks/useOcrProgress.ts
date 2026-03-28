/**
 * Hook: useOcrProgress
 *
 * Orchestrates the OCR processing pipeline for a document:
 *   1. Load document pages from the store
 *   2. Run OCR on each page sequentially via performOcrBatch
 *   3. Save OCR text to each page record in the database
 *   4. Update processing store progress in real time
 *   5. Advance pipeline to the detecting stage on completion
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDocumentStore, selectDocumentById } from '../stores/document-store';
import { useProcessingStore } from '../stores/processing-store';
import { performOcr, extractPlainText, type OcrResult } from '../services/ocr';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PageOcrStatus = 'pending' | 'processing' | 'success' | 'error' | 'no_text';

export interface PageOcrInfo {
  pageId: string;
  pageNumber: number;
  status: PageOcrStatus;
  textPreview?: string;
  error?: string;
}

export interface UseOcrProgressOptions {
  documentId: string;
  /** Auto-start OCR when the hook mounts. @default true */
  autoStart?: boolean;
  onComplete?: (documentId: string) => void;
}

export interface UseOcrProgressReturn {
  /** Per-page OCR status information. */
  pages: PageOcrInfo[];
  /** Overall progress from 0 to 1. */
  progress: number;
  /** Whether OCR is currently running. */
  isProcessing: boolean;
  /** Whether all pages have been processed. */
  isComplete: boolean;
  /** Start or restart OCR processing. */
  start: () => Promise<void>;
  /** Cancel the current OCR run. */
  cancel: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOcrProgress({
  documentId,
  autoStart = true,
  onComplete,
}: UseOcrProgressOptions): UseOcrProgressReturn {
  const [pageInfos, setPageInfos] = useState<PageOcrInfo[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  const selector = useMemo(() => selectDocumentById(documentId), [documentId]);
  const document = useDocumentStore(selector);
  const updatePage = useDocumentStore((s) => s.updatePage);
  const updateStatus = useDocumentStore((s) => s.updateStatus);
  const updateProgress = useProcessingStore((s) => s.updateProgress);
  const completeCurrentStage = useProcessingStore((s) => s.completeCurrentStage);
  const advanceStage = useProcessingStore((s) => s.advanceStage);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const pages = document?.pages
    ? [...document.pages].sort((a, b) => a.pageNumber - b.pageNumber)
    : [];

  const start = useCallback(async () => {
    if (isProcessing || pages.length === 0) return;

    cancelledRef.current = false;
    setIsProcessing(true);
    setIsComplete(false);
    setProgress(0);

    // Initialize page statuses
    const initialInfos: PageOcrInfo[] = pages.map((p) => ({
      pageId: p.id,
      pageNumber: p.pageNumber,
      status: 'pending' as PageOcrStatus,
    }));
    setPageInfos(initialInfos);

    for (let i = 0; i < pages.length; i++) {
      if (cancelledRef.current) break;

      const page = pages[i]!;
      const imageUri = page.processedImageUri ?? page.originalImageUri;

      // Mark current page as processing
      setPageInfos((prev) =>
        prev.map((p) => (p.pageId === page.id ? { ...p, status: 'processing' } : p)),
      );

      let result: OcrResult;
      try {
        result = await performOcr(imageUri);
      } catch (error) {
        result = {
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }

      if (cancelledRef.current) break;

      // Update page info based on result
      const text = extractPlainText(result);
      const preview = text.slice(0, 100);

      if (result.status === 'success') {
        setPageInfos((prev) =>
          prev.map((p) =>
            p.pageId === page.id ? { ...p, status: 'success', textPreview: preview } : p,
          ),
        );
        // Persist OCR text to database
        try {
          await updatePage(page.id, { ocrText: text }, documentId);
        } catch {
          // DB write failure is non-fatal for the progress screen
        }
      } else if (result.status === 'no_text') {
        setPageInfos((prev) =>
          prev.map((p) => (p.pageId === page.id ? { ...p, status: 'no_text' } : p)),
        );
        // Still save empty text
        try {
          await updatePage(page.id, { ocrText: '' }, documentId);
        } catch {
          // Non-fatal
        }
      } else {
        setPageInfos((prev) =>
          prev.map((p) =>
            p.pageId === page.id ? { ...p, status: 'error', error: result.error.message } : p,
          ),
        );
      }

      const newProgress = (i + 1) / pages.length;
      setProgress(newProgress);
      updateProgress(newProgress);
    }

    if (!cancelledRef.current) {
      // Advance pipeline
      try {
        await updateStatus(documentId, 'ocr_complete');
      } catch {
        // Status update failure is non-fatal
      }
      completeCurrentStage();
      advanceStage();
      setIsComplete(true);
      onCompleteRef.current?.(documentId);
    }

    setIsProcessing(false);
  }, [
    isProcessing,
    pages,
    documentId,
    updatePage,
    updateStatus,
    updateProgress,
    completeCurrentStage,
    advanceStage,
  ]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart && !startedRef.current && pages.length > 0) {
      startedRef.current = true;
      void start();
    }
  }, [autoStart, pages.length, start]);

  return {
    pages: pageInfos,
    progress,
    isProcessing,
    isComplete,
    start,
    cancel,
  };
}
