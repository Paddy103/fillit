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

function createTempSource(name: string, content: string): File {
  const tempDir = getTempDir();
  tempDir.create({ intermediates: true, idempotent: true });
  const src = new File(tempDir, name);
  src.write(content);
  return src;
}

function testSaveFile(docId: string): { result: TestResult; savedUri: string } {
  const src = createTempSource('e2e-source.txt', 'E2E test content');
  const savedUri = saveFile(docId, 'originals', 'page-1.txt', src.uri);
  src.delete();
  return {
    result: savedUri.includes(docId)
      ? pass('Save file', savedUri.split('/').slice(-3).join('/'))
      : fail('Save file', `Bad URI: ${savedUri}`),
    savedUri,
  };
}

async function testReadFile(uri: string): Promise<TestResult> {
  const base64 = await readFile(uri);
  return base64.length > 0
    ? pass('Read file', `${base64.length} chars base64`)
    : fail('Read file', 'Empty content');
}

function testDeleteAndSize(docId: string, savedUri: string): TestResult[] {
  const results: TestResult[] = [];

  results.push(
    getDocumentFileSize(docId) > 0
      ? pass('File size', `${getDocumentFileSize(docId)} bytes`)
      : fail('File size', 'Got 0'),
  );

  const docs = listDocuments();
  const found = docs.find((d) => d.documentId === docId);
  results.push(
    found
      ? pass('List documents', `${found.fileCount} files, ${found.totalSize}B`)
      : fail('List documents', 'Not found'),
  );

  deleteFile(savedUri);
  results.push(!fileExists(savedUri) ? pass('Delete file') : fail('Delete file', 'Still exists'));

  return results;
}

function testDeleteDocumentFiles(docId: string): TestResult {
  const src = createTempSource('e2e-del.txt', 'delete me');
  saveFile(docId, 'processed', 'page-1.txt', src.uri);
  src.delete();
  deleteDocumentFiles(docId);
  return getDocumentFileSize(docId) === 0
    ? pass('Delete document files')
    : fail('Delete document files', 'Files remain');
}

function testOrphanCleanup(): TestResult {
  const src = createTempSource('e2e-orphan.txt', 'orphan');
  saveFile('e2e-orphan-999', 'originals', 'page.txt', src.uri);
  src.delete();
  const deleted = cleanupOrphanedFiles([]);
  return deleted >= 1
    ? pass('Orphan cleanup', `Deleted ${deleted}`)
    : fail('Orphan cleanup', `Expected >= 1, got ${deleted}`);
}

function testPathTraversal(): TestResult {
  try {
    saveFile('../../../evil', 'originals', 'hack.txt', 'file:///nope');
    return fail('Path traversal blocked', 'Should have thrown');
  } catch (e) {
    return e instanceof FileStorageError
      ? pass('Path traversal blocked')
      : fail('Path traversal blocked', String(e));
  }
}

export async function runFileStorageTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const docId = 'e2e-' + Date.now();

  try {
    try {
      deleteDocumentFiles(docId);
    } catch {
      // ignore
    }

    const { result: saveResult, savedUri } = testSaveFile(docId);
    results.push(saveResult);

    if (savedUri) {
      results.push(fileExists(savedUri) ? pass('File exists') : fail('File exists', 'Not found'));
      results.push(await testReadFile(savedUri));
      results.push(...testDeleteAndSize(docId, savedUri));
    }

    results.push(testDeleteDocumentFiles(docId));
    results.push(testOrphanCleanup());
    results.push(testPathTraversal());
  } catch (e) {
    results.push(fail('Unexpected error', String(e)));
  }

  return results;
}
