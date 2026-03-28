/**
 * Hook: useFieldDetection
 *
 * Orchestrates the AI field detection pipeline for a document:
 *   1. Load document pages with OCR data from the store
 *   2. Route to cloud API or offline heuristics via AI router
 *   3. Track per-page progress in real time
 *   4. Save detected fields to the document store
 *   5. Advance pipeline to the matching stage on completion
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useDocumentStore, selectDocumentById } from '../stores/document-store';
import { useProcessingStore } from '../stores/processing-store';
import {
  detectFields,
  type AiRouterConfig,
  type DetectionMethod,
  type DetectionResult,
} from '../services/ai';
import { ApiClient } from '../services/api/client';
import { API_BASE_URL } from '../services/api/config';

// ─── Types ─────────────────────────────────────────────────────────

export type DetectionPageStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface DetectionPageInfo {
  pageId: string;
  pageNumber: number;
  status: DetectionPageStatus;
  fieldCount?: number;
  error?: string;
}

export interface UseFieldDetectionOptions {
  documentId: string;
  /** Available profile fields for matching. */
  availableFields: string[];
  /** Function to get the auth token. */
  getAuthToken: () => Promise<string | null>;
  /** Auto-start detection on mount. @default true */
  autoStart?: boolean;
  /** Force a specific detection method (for testing). */
  forceMethod?: DetectionMethod;
  /** Called when detection completes. */
  onComplete?: (result: DetectionResult) => void;
  /** Called on error. */
  onError?: (error: Error) => void;
}

export interface UseFieldDetectionReturn {
  /** Per-page detection status. */
  pages: DetectionPageInfo[];
  /** Overall progress from 0 to 1. */
  progress: number;
  /** Whether detection is running. */
  isProcessing: boolean;
  /** Whether detection is complete. */
  isComplete: boolean;
  /** Which method was used (cloud or offline). */
  method: DetectionMethod | null;
  /** Whether results have reduced accuracy (offline). */
  reducedAccuracy: boolean;
  /** Error message if detection failed. */
  error: string | null;
  /** Start or restart detection. */
  start: () => Promise<void>;
  /** Cancel detection. */
  cancel: () => void;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useFieldDetection({
  documentId,
  availableFields,
  getAuthToken,
  autoStart = true,
  forceMethod,
  onComplete,
  onError,
}: UseFieldDetectionOptions): UseFieldDetectionReturn {
  const document = useDocumentStore(selectDocumentById(documentId));
  const setFields = useDocumentStore((s) => s.setFields);
  const advanceStage = useProcessingStore((s) => s.advanceStage);

  const [pages, setPages] = useState<DetectionPageInfo[]>([]);
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [method, setMethod] = useState<DetectionMethod | null>(null);
  const [reducedAccuracy, setReducedAccuracy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const startedRef = useRef(false);

  // Initialize page list from document
  useEffect(() => {
    if (document?.pages) {
      setPages(
        document.pages.map((p) => ({
          pageId: p.id,
          pageNumber: p.pageNumber,
          status: 'pending' as const,
        })),
      );
    }
  }, [document?.pages]);

  const start = useCallback(async () => {
    if (!document?.pages || document.pages.length === 0) return;
    if (isProcessing) return;

    cancelledRef.current = false;
    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(0);

    // Mark all pages as processing
    setPages((prev) => prev.map((p) => ({ ...p, status: 'processing' as const })));
    setProgress(0.1);

    try {
      const client = new ApiClient({
        baseUrl: API_BASE_URL,
        getAuthToken,
      });

      const config: AiRouterConfig = {
        client,
        availableFields,
        forceMethod,
      };

      // Build pages input from document data
      const pagesInput = document.pages.map((p) => ({
        pageNumber: p.pageNumber,
        imageBase64: '', // Will be loaded by the analyze endpoint from URI
        ocrBlocks: [] as Array<{
          text: string;
          bounds: { x: number; y: number; width: number; height: number };
          confidence: number;
        }>,
      }));

      if (cancelledRef.current) return;

      setProgress(0.3);

      // Run detection
      const result = await detectFields(config, pagesInput);

      if (cancelledRef.current) return;

      setProgress(0.8);
      setMethod(result.method);
      setReducedAccuracy(result.reducedAccuracy);

      // Save fields to store
      const detectedFields = result.fields.map((f) => ({
        id: f.id,
        pageId: document.pages.find((p) => p.pageNumber === f.pageNumber)?.id ?? '',
        label: f.label,
        normalizedLabel: f.label.toLowerCase().trim(),
        fieldType: f.fieldType,
        bounds: f.bounds,
        matchedProfileField: f.matchedField ?? undefined,
        matchConfidence: f.matchConfidence,
        value: '',
        isConfirmed: false,
        isSignatureField: f.fieldType === 'signature' || f.fieldType === 'initial',
      }));

      setFields(documentId, detectedFields);

      // Mark pages complete with field counts
      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          status: 'complete' as const,
          fieldCount: result.fields.filter((f) => f.pageNumber === p.pageNumber).length,
        })),
      );

      setProgress(1);
      setIsComplete(true);
      setIsProcessing(false);

      // Advance pipeline stage
      advanceStage();

      onComplete?.(result);
    } catch (err) {
      if (cancelledRef.current) return;

      const message = err instanceof Error ? err.message : 'Field detection failed';
      setError(message);
      setIsProcessing(false);

      // Mark pages as error
      setPages((prev) =>
        prev.map((p) => ({
          ...p,
          status: p.status === 'complete' ? 'complete' : ('error' as const),
          error: message,
        })),
      );

      onError?.(err instanceof Error ? err : new Error(message));
    }
  }, [
    document,
    documentId,
    availableFields,
    getAuthToken,
    forceMethod,
    isProcessing,
    setFields,
    advanceStage,
    onComplete,
    onError,
  ]);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsProcessing(false);
    setPages((prev) =>
      prev.map((p) => (p.status === 'processing' ? { ...p, status: 'pending' as const } : p)),
    );
  }, []);

  // Auto-start
  useEffect(() => {
    if (autoStart && !startedRef.current && document?.pages && document.pages.length > 0) {
      startedRef.current = true;
      start();
    }
  }, [autoStart, document?.pages, start]);

  return {
    pages,
    progress,
    isProcessing,
    isComplete,
    method,
    reducedAccuracy,
    error,
    start,
    cancel,
  };
}
