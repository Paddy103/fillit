/**
 * E2E test suite for file storage service (S-21).
 *
 * Exercises: save, read, delete, size tracking, list, orphan cleanup,
 * path traversal rejection.
 */

import { File } from 'expo-file-system';

import {
  saveFile,
  readFile,
  fileExists,
  deleteFile,
  deleteDocumentFiles,
  getDocumentFileSize,
  listDocuments,
  cleanupOrphanedFiles,
  getTempDir,
} from '../services/storage/fileStorage';
import { FileStorageError } from '../services/storage/fileStorageErrors';

import { type TestResult, pass, fail } from './types';

export async function runFileStorageTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const docId = 'e2e-' + Date.now();

  try {
    try {
      deleteDocumentFiles(docId);
    } catch {
      // ignore — may not exist
    }

    // Test 1: Save file
    let savedUri = '';
    try {
      const tempDir = getTempDir();
      tempDir.create({ intermediates: true, idempotent: true });
      const src = new File(tempDir, 'e2e-source.txt');
      src.write('E2E test content');

      savedUri = saveFile(docId, 'originals', 'page-1.txt', src.uri);
      src.delete();
      results.push(
        savedUri.includes(docId)
          ? pass('Save file', savedUri.split('/').slice(-3).join('/'))
          : fail('Save file', `Bad URI: ${savedUri}`),
      );
    } catch (e) {
      results.push(fail('Save file', String(e)));
    }

    // Test 2: File exists
    if (savedUri) {
      try {
        results.push(
          fileExists(savedUri) ? pass('File exists') : fail('File exists', 'Not found after save'),
        );
      } catch (e) {
        results.push(fail('File exists', String(e)));
      }
    }

    // Test 3: Read file
    if (savedUri) {
      try {
        const base64 = await readFile(savedUri);
        results.push(
          base64.length > 0
            ? pass('Read file', `${base64.length} chars base64`)
            : fail('Read file', 'Empty content'),
        );
      } catch (e) {
        results.push(fail('Read file', String(e)));
      }
    }

    // Test 4: File size
    try {
      const size = getDocumentFileSize(docId);
      results.push(
        size > 0 ? pass('File size', `${size} bytes`) : fail('File size', `Got ${size}`),
      );
    } catch (e) {
      results.push(fail('File size', String(e)));
    }

    // Test 5: List documents
    try {
      const docs = listDocuments();
      const found = docs.find((d) => d.documentId === docId);
      results.push(
        found
          ? pass('List documents', `${found.fileCount} files, ${found.totalSize}B`)
          : fail('List documents', 'Not found'),
      );
    } catch (e) {
      results.push(fail('List documents', String(e)));
    }

    // Test 6: Delete file
    if (savedUri) {
      try {
        deleteFile(savedUri);
        results.push(
          !fileExists(savedUri) ? pass('Delete file') : fail('Delete file', 'Still exists'),
        );
      } catch (e) {
        results.push(fail('Delete file', String(e)));
      }
    }

    // Test 7: Delete document files
    try {
      const tempDir = getTempDir();
      tempDir.create({ intermediates: true, idempotent: true });
      const src = new File(tempDir, 'e2e-del.txt');
      src.write('delete me');
      saveFile(docId, 'processed', 'page-1.txt', src.uri);
      src.delete();

      deleteDocumentFiles(docId);
      results.push(
        getDocumentFileSize(docId) === 0
          ? pass('Delete document files')
          : fail('Delete document files', 'Files remain'),
      );
    } catch (e) {
      results.push(fail('Delete document files', String(e)));
    }

    // Test 8: Orphan cleanup
    try {
      const tempDir = getTempDir();
      tempDir.create({ intermediates: true, idempotent: true });
      const src = new File(tempDir, 'e2e-orphan.txt');
      src.write('orphan');
      saveFile('e2e-orphan-999', 'originals', 'page.txt', src.uri);
      src.delete();

      const deleted = cleanupOrphanedFiles([]);
      results.push(
        deleted >= 1
          ? pass('Orphan cleanup', `Deleted ${deleted}`)
          : fail('Orphan cleanup', `Expected >= 1, got ${deleted}`),
      );
    } catch (e) {
      results.push(fail('Orphan cleanup', String(e)));
    }

    // Test 9: Path traversal blocked
    try {
      let blocked = false;
      try {
        saveFile('../../../evil', 'originals', 'hack.txt', 'file:///nope');
      } catch (e) {
        if (e instanceof FileStorageError) blocked = true;
      }
      results.push(
        blocked
          ? pass('Path traversal blocked')
          : fail('Path traversal blocked', 'Should have thrown'),
      );
    } catch (e) {
      results.push(fail('Path traversal blocked', String(e)));
    }
  } catch (e) {
    results.push(fail('Unexpected error', String(e)));
  }

  return results;
}
