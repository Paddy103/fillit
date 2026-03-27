/**
 * Hook: useScanDocument
 *
 * Orchestrates the full document scanning flow:
 *   1. Launch native ML Kit document scanner
 *   2. Create a document record in the database
 *   3. Save scanned images to local file storage
 *   4. Create page records for each scanned image
 *   5. Advance the processing pipeline to the review stage
 */

import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { scanDocument, type ScanConfig } from '../services/scanner/documentScanner';
import { useDocumentStore } from '../stores/document-store';
import { useProcessingStore } from '../stores/processing-store';
import { saveFile } from '../services/storage/fileStorage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseScanDocumentOptions {
  /** Scanner configuration overrides. */
  config?: ScanConfig;
  /** Callback invoked after a successful scan with the new document ID. */
  onSuccess?: (documentId: string, pageCount: number) => void;
}

export interface UseScanDocumentReturn {
  /** Launch the document scanner. No-op if already scanning. */
  scan: () => Promise<void>;
  /** Whether the scanner is currently active or saving results. */
  isScanning: boolean;
}

/**
 * Hook that manages the document scanning lifecycle.
 *
 * @example
 * ```tsx
 * const { scan, isScanning } = useScanDocument({
 *   onSuccess: (id, count) => router.push(`/scan-review/${id}`),
 * });
 *
 * <Button onPress={scan} loading={isScanning} label="Scan" />
 * ```
 */
export function useScanDocument(options?: UseScanDocumentOptions): UseScanDocumentReturn {
  const [isScanning, setIsScanning] = useState(false);

  // Synchronous guard to prevent double-tap race condition.
  // useState alone is insufficient because the setter is async —
  // two rapid taps can both read isScanning=false before the first
  // setState commits.
  const isScanningRef = useRef(false);

  // Stable ref for options to avoid useCallback re-creation on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const createDocument = useDocumentStore((s) => s.createDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const createPage = useDocumentStore((s) => s.createPage);
  const startProcessing = useProcessingStore((s) => s.startProcessing);
  const completeCurrentStage = useProcessingStore((s) => s.completeCurrentStage);
  const advanceStage = useProcessingStore((s) => s.advanceStage);
  const resetProcessing = useProcessingStore((s) => s.reset);

  const scan = useCallback(async () => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    setIsScanning(true);

    let documentId: string | null = null;

    try {
      const result = await scanDocument(optionsRef.current?.config);

      if (result.status === 'canceled') {
        return;
      }

      if (result.status === 'error') {
        Alert.alert('Scan Failed', result.error.message);
        return;
      }

      // Create document record in SQLite
      documentId = generateId();
      await createDocument({
        id: documentId,
        title: `Scan ${new Date().toLocaleDateString()}`,
        sourceType: 'camera',
      });

      // Start processing pipeline (idle → scanning)
      startProcessing(documentId);

      // Save each scanned page image and create DB records
      const { pages } = result.data;
      for (let i = 0; i < pages.length; i++) {
        const sourceUri = pages[i]!;
        const pageNumber = i + 1;
        const filename = `page-${pageNumber}.jpg`;

        const savedUri = saveFile(documentId, 'originals', filename, sourceUri);

        await createPage({
          id: generateId(),
          documentId,
          pageNumber,
          originalImageUri: savedUri,
        });
      }

      // Complete scanning stage and advance to reviewing
      completeCurrentStage();
      advanceStage();

      optionsRef.current?.onSuccess?.(documentId, pages.length);
      documentId = null; // Mark success — skip cleanup
    } catch (error) {
      // Roll back partial state on failure
      if (documentId) {
        try {
          await deleteDocument(documentId);
        } catch {
          // Cleanup failure is non-fatal
        }
        resetProcessing();
      }

      Alert.alert(
        'Scan Error',
        error instanceof Error ? error.message : 'An unexpected error occurred while scanning.',
      );
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  }, [
    createDocument,
    deleteDocument,
    createPage,
    startProcessing,
    completeCurrentStage,
    advanceStage,
    resetProcessing,
  ]);

  return { scan, isScanning };
}
