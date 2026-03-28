/**
 * Hook: useImportDocument
 *
 * Orchestrates the document import flow:
 *   1. Launch native document picker for images and PDFs
 *   2. Validate selected files (format, size)
 *   3. Create a document record in the database
 *   4. Save imported images to local file storage
 *   5. Create page records for each imported image
 *   6. Advance the processing pipeline to the review stage
 *
 * Currently supports image import (JPEG, PNG). PDF support is scaffolded
 * and will be fully implemented with image extraction in S-45.
 */

import { useCallback, useRef, useState } from 'react';
import { Alert, Image } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { useDocumentStore } from '../stores/document-store';
import { useProcessingStore } from '../stores/processing-store';
import { saveFile } from '../services/storage/fileStorage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum file size in bytes (20 MB). */
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Accepted MIME types for the document picker. */
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

/** Image MIME types we can process directly. */
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

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

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseImportDocumentOptions {
  /** Callback invoked after a successful import with the new document ID. */
  onSuccess?: (documentId: string, pageCount: number) => void;
}

export interface UseImportDocumentReturn {
  /** Launch the document picker and import selected files. */
  importFiles: () => Promise<void>;
  /** Whether the import is currently in progress. */
  isImporting: boolean;
  /** Import progress (0 to 1) for multi-file imports. */
  progress: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useImportDocument(options?: UseImportDocumentOptions): UseImportDocumentReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const isImportingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const createDocument = useDocumentStore((s) => s.createDocument);
  const deleteDocument = useDocumentStore((s) => s.deleteDocument);
  const createPage = useDocumentStore((s) => s.createPage);
  const startProcessing = useProcessingStore((s) => s.startProcessing);
  const completeCurrentStage = useProcessingStore((s) => s.completeCurrentStage);
  const advanceStage = useProcessingStore((s) => s.advanceStage);
  const resetProcessing = useProcessingStore((s) => s.reset);

  const importFiles = useCallback(async () => {
    if (isImportingRef.current) return;
    isImportingRef.current = true;
    setIsImporting(true);
    setProgress(0);

    let documentId: string | null = null;

    try {
      // Launch the document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const assets = result.assets;
      if (!assets || assets.length === 0) {
        return;
      }

      // Separate images and PDFs
      const imageAssets = assets.filter((a) => IMAGE_MIME_TYPES.has(a.mimeType ?? ''));
      const pdfAssets = assets.filter((a) => a.mimeType === 'application/pdf');

      if (imageAssets.length === 0 && pdfAssets.length > 0) {
        Alert.alert(
          'PDF Import Coming Soon',
          'Full PDF page extraction will be available in a future update. Please import images (JPEG, PNG) for now.',
        );
        return;
      }

      if (imageAssets.length === 0) {
        Alert.alert('No Valid Files', 'Please select JPEG or PNG image files.');
        return;
      }

      // Notify about skipped PDFs
      if (pdfAssets.length > 0) {
        Alert.alert(
          'Note',
          `${pdfAssets.length} PDF file(s) were skipped. PDF import will be available in a future update. Importing ${imageAssets.length} image(s).`,
        );
      }

      // Validate image files
      const validAssets = [];
      for (const asset of imageAssets) {
        if (asset.size && asset.size > MAX_FILE_SIZE_BYTES) {
          Alert.alert('File Too Large', `"${asset.name}" exceeds the 20 MB limit and was skipped.`);
          continue;
        }
        validAssets.push(asset);
      }

      if (validAssets.length === 0) {
        Alert.alert('No Valid Files', 'All selected files were too large or invalid.');
        return;
      }

      // Create document record
      documentId = generateId();
      await createDocument({
        id: documentId,
        title:
          validAssets.length === 1
            ? (validAssets[0]!.name ?? 'Import')
            : `Import ${new Date().toLocaleDateString()}`,
        sourceType: 'import',
      });

      // Start processing pipeline
      startProcessing(documentId);

      // Save each image and create page records
      for (let i = 0; i < validAssets.length; i++) {
        const asset = validAssets[i]!;
        const pageNumber = i + 1;
        const extension = asset.mimeType === 'image/png' ? 'png' : 'jpg';
        const filename = `page-${pageNumber}.${extension}`;

        const savedUri = saveFile(documentId, 'originals', filename, asset.uri);

        // Get image dimensions
        let width = 0;
        let height = 0;
        try {
          const size = await getImageSize(savedUri);
          width = size.width;
          height = size.height;
        } catch {
          // Dimension detection failure is non-fatal
        }

        await createPage({
          id: generateId(),
          documentId,
          pageNumber,
          originalImageUri: savedUri,
          width,
          height,
        });

        setProgress((i + 1) / validAssets.length);
      }

      // Complete scanning stage and advance to reviewing
      completeCurrentStage();
      advanceStage();

      optionsRef.current?.onSuccess?.(documentId, validAssets.length);
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
        'Import Error',
        error instanceof Error ? error.message : 'An unexpected error occurred while importing.',
      );
    } finally {
      isImportingRef.current = false;
      setIsImporting(false);
      setProgress(0);
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

  return { importFiles, isImporting, progress };
}
