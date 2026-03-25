/**
 * Local File Storage Service
 *
 * Manages file operations for document images, processed images, exported PDFs,
 * and signature images using expo-file-system (SDK 55+ class-based API).
 * Files are organized by document ID in subdirectories under the app's
 * document directory.
 *
 * Directory structure:
 *   {Paths.document}/documents/{documentId}/originals/
 *   {Paths.document}/documents/{documentId}/processed/
 *   {Paths.document}/documents/{documentId}/pdf/
 *   {Paths.document}/temp/
 */

import { Directory, File, Paths } from 'expo-file-system';

import {
  DirectoryError,
  FileDeleteError,
  FileReadError,
  FileStorageError,
  FileWriteError,
} from './fileStorageErrors';

/** Subdirectory types for organizing files within a document. */
export type FileSubdirectory = 'originals' | 'processed' | 'pdf';

/** Information about a document's stored files. */
export interface DocumentFileInfo {
  documentId: string;
  fileCount: number;
  totalSize: number;
}

/** Base directory for all document files. */
const DOCUMENTS_DIR = 'documents';

/** Temporary directory for in-progress operations. */
const TEMP_DIR = 'temp';

/**
 * Validate that a path segment does not contain traversal sequences or separators.
 * Prevents directory escape attacks via crafted document IDs or filenames.
 */
function validatePathSegment(value: string, label: string): void {
  if (
    !value ||
    value.includes('/') ||
    value.includes('\\') ||
    value.includes('..') ||
    value.includes('\0')
  ) {
    throw new FileStorageError(
      `Invalid ${label}: must not be empty or contain path separators or traversal sequences`,
    );
  }
}

// ─── Path Helpers ─────────────────────────────────────────────────────

/**
 * Get the base documents directory.
 */
export function getDocumentsBaseDir(): Directory {
  return new Directory(Paths.document, DOCUMENTS_DIR);
}

/**
 * Get the directory for a specific document.
 */
export function getDocumentDir(documentId: string): Directory {
  validatePathSegment(documentId, 'documentId');
  return new Directory(Paths.document, DOCUMENTS_DIR, documentId);
}

/**
 * Get the subdirectory within a document's directory.
 */
export function getSubdirectory(documentId: string, subdirectory: FileSubdirectory): Directory {
  validatePathSegment(documentId, 'documentId');
  return new Directory(Paths.document, DOCUMENTS_DIR, documentId, subdirectory);
}

/**
 * Get the expected path for a page image file.
 *
 * @param documentId - The document UUID.
 * @param pageNumber - The 1-based page number.
 * @param type - Whether this is the original or processed image.
 */
export function getPageImageFile(
  documentId: string,
  pageNumber: number,
  type: 'originals' | 'processed',
): File {
  validatePathSegment(documentId, 'documentId');
  const suffix = type === 'processed' ? '-enhanced' : '';
  return new File(
    Paths.document,
    DOCUMENTS_DIR,
    documentId,
    type,
    `page-${pageNumber}${suffix}.jpg`,
  );
}

/**
 * Get the expected path for an exported PDF.
 */
export function getExportedPdfFile(documentId: string): File {
  validatePathSegment(documentId, 'documentId');
  return new File(Paths.document, DOCUMENTS_DIR, documentId, 'pdf', `${documentId}.pdf`);
}

/**
 * Get the temporary directory.
 */
export function getTempDir(): Directory {
  return new Directory(Paths.document, TEMP_DIR);
}

// ─── Directory Operations ─────────────────────────────────────────────

/**
 * Ensure a directory exists, creating it and all parent directories if needed.
 */
function ensureDirectory(dir: Directory): void {
  try {
    dir.create({ intermediates: true, idempotent: true });
  } catch (error) {
    throw new DirectoryError(`Failed to create directory: ${dir.uri}`, error);
  }
}

// ─── File Operations ──────────────────────────────────────────────────

/**
 * Save a file to the document storage directory.
 *
 * Copies the source file into the appropriate subdirectory organized by
 * document ID. Creates the directory structure if it doesn't exist.
 *
 * @param documentId - The document UUID to organize under.
 * @param subdirectory - The file category (originals, processed, pdf).
 * @param filename - The target filename.
 * @param sourceUri - The source file URI to copy from.
 * @returns The full URI to the saved file.
 */
export function saveFile(
  documentId: string,
  subdirectory: FileSubdirectory,
  filename: string,
  sourceUri: string,
): string {
  validatePathSegment(filename, 'filename');
  try {
    const targetDir = getSubdirectory(documentId, subdirectory);
    ensureDirectory(targetDir);

    const sourceFile = new File(sourceUri);
    const targetFile = new File(targetDir, filename);

    // Delete existing target if present to allow overwrite
    if (targetFile.exists) {
      targetFile.delete();
    }

    sourceFile.copy(targetFile);
    return targetFile.uri;
  } catch (error) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    throw new FileWriteError(`Failed to save file ${filename} for document ${documentId}`, error);
  }
}

/**
 * Read a file's contents as a base64 string.
 *
 * @param uri - The file URI to read.
 * @returns The file contents as a base64-encoded string.
 */
export async function readFile(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    return await file.base64();
  } catch (error) {
    throw new FileReadError(`Failed to read file: ${uri}`, error);
  }
}

/**
 * Check whether a file exists.
 *
 * @param uri - The file URI to check.
 * @returns `true` if the file exists.
 */
export function fileExists(uri: string): boolean {
  try {
    const file = new File(uri);
    return file.exists;
  } catch {
    return false;
  }
}

/**
 * Delete a single file.
 *
 * @param uri - The file URI to delete.
 */
export function deleteFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    throw new FileDeleteError(`Failed to delete file: ${uri}`, error);
  }
}

/**
 * Delete all files for a document.
 *
 * Removes the entire document directory and all its contents.
 *
 * @param documentId - The document UUID whose files should be deleted.
 */
export function deleteDocumentFiles(documentId: string): void {
  try {
    const docDir = getDocumentDir(documentId);
    if (docDir.exists) {
      docDir.delete();
    }
  } catch (error) {
    throw new FileDeleteError(`Failed to delete files for document ${documentId}`, error);
  }
}

/**
 * Get the total size of all files for a document in bytes.
 *
 * @param documentId - The document UUID to measure.
 * @returns Total size in bytes, or 0 if the document directory doesn't exist.
 */
export function getDocumentFileSize(documentId: string): number {
  try {
    const docDir = getDocumentDir(documentId);
    if (!docDir.exists) {
      return 0;
    }
    return docDir.size ?? 0;
  } catch (error) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    throw new FileReadError(`Failed to get file size for document ${documentId}`, error);
  }
}

/**
 * List all documents that have files stored locally.
 *
 * @returns Array of document file information.
 */
export function listDocuments(): DocumentFileInfo[] {
  try {
    const baseDir = getDocumentsBaseDir();
    if (!baseDir.exists) {
      return [];
    }

    const entries = baseDir.list();
    const results: DocumentFileInfo[] = [];

    for (const entry of entries) {
      if (entry instanceof Directory) {
        const fileCount = countFilesInDirectory(entry);
        const totalSize = entry.size ?? 0;
        // Extract document ID from the directory name
        const documentId = entry.uri.replace(/\/$/, '').split('/').pop() ?? '';
        results.push({ documentId, fileCount, totalSize });
      }
    }

    return results;
  } catch (error) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    throw new FileReadError('Failed to list documents', error);
  }
}

/**
 * Recursively count all files (not directories) in a directory.
 */
function countFilesInDirectory(dir: Directory): number {
  let count = 0;
  const entries = dir.list();

  for (const entry of entries) {
    if (entry instanceof Directory) {
      count += countFilesInDirectory(entry);
    } else {
      count += 1;
    }
  }

  return count;
}

/**
 * Clean up orphaned files that are not associated with any known document IDs.
 *
 * @param knownDocumentIds - Array of document IDs that should be kept.
 * @returns The number of orphaned document directories that were deleted.
 */
export function cleanupOrphanedFiles(knownDocumentIds: string[]): number {
  try {
    const baseDir = getDocumentsBaseDir();
    if (!baseDir.exists) {
      return 0;
    }

    const entries = baseDir.list();
    const knownSet = new Set(knownDocumentIds);
    let deletedCount = 0;

    for (const entry of entries) {
      if (entry instanceof Directory) {
        const dirName = entry.uri.replace(/\/$/, '').split('/').pop() ?? '';
        if (!knownSet.has(dirName)) {
          entry.delete();
          deletedCount += 1;
        }
      }
    }

    return deletedCount;
  } catch (error) {
    if (error instanceof FileStorageError) {
      throw error;
    }
    throw new FileDeleteError('Failed to clean up orphaned files', error);
  }
}

/**
 * Clean up temporary files.
 *
 * Deletes the entire temp directory and its contents.
 *
 * @returns The number of files that were deleted.
 */
export function cleanupTempFiles(): number {
  try {
    const tempDir = getTempDir();
    if (!tempDir.exists) {
      return 0;
    }

    const count = countFilesInDirectory(tempDir);
    tempDir.delete();
    return count;
  } catch (error) {
    throw new FileDeleteError('Failed to clean up temp files', error);
  }
}
