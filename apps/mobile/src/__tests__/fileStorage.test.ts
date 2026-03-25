import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockFs } = vi.hoisted(() => {
  /** In-memory filesystem for testing. Keyed by URI. */
  const files = new Map<string, { content: string; size: number }>();
  const directories = new Set<string>();

  /** Normalize URI — ensure dirs end with / and files don't. */
  function normDir(uri: string): string {
    return uri.endsWith('/') ? uri : `${uri}/`;
  }

  /** Get all entries directly inside a directory (one level). */
  function listDir(dirUri: string): string[] {
    const normalizedDir = normDir(dirUri);
    const entries = new Set<string>();

    for (const key of files.keys()) {
      if (key.startsWith(normalizedDir)) {
        const rest = key.slice(normalizedDir.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) entries.add(firstSegment);
      }
    }

    for (const key of directories) {
      if (key.startsWith(normalizedDir) && key !== normalizedDir) {
        const rest = key.slice(normalizedDir.length);
        const firstSegment = rest.split('/')[0];
        if (firstSegment) entries.add(firstSegment);
      }
    }

    return [...entries];
  }

  /** Count all files recursively under a directory. */
  function countFiles(dirUri: string): number {
    const normalizedDir = normDir(dirUri);
    let count = 0;
    for (const key of files.keys()) {
      if (key.startsWith(normalizedDir)) {
        count++;
      }
    }
    return count;
  }

  /** Calculate total size of all files under a directory. */
  function totalSize(dirUri: string): number {
    const normalizedDir = normDir(dirUri);
    let size = 0;
    for (const [key, value] of files.entries()) {
      if (key.startsWith(normalizedDir)) {
        size += value.size;
      }
    }
    return size;
  }

  /** Delete everything under a directory. */
  function deleteRecursive(dirUri: string): void {
    const normalizedDir = normDir(dirUri);
    for (const key of [...files.keys()]) {
      if (key.startsWith(normalizedDir)) {
        files.delete(key);
      }
    }
    for (const key of [...directories]) {
      if (key.startsWith(normalizedDir)) {
        directories.delete(key);
      }
    }
  }

  return {
    mockFs: {
      files,
      directories,
      listDir,
      countFiles,
      totalSize,
      deleteRecursive,
      reset: () => {
        files.clear();
        directories.clear();
      },
    },
  };
});

// Mock expo-file-system with SDK 55 class-based API
vi.mock('expo-file-system', () => {
  const DOCUMENT_DIR = 'file:///data/user/0/com.fillit/files/';

  class MockFile {
    uri: string;
    constructor(...uris: (string | MockFile | MockDirectory)[]) {
      const parts: string[] = [];
      for (const u of uris) {
        if (typeof u === 'string') {
          parts.push(u.replace(/\/$/, ''));
        } else {
          parts.push(u.uri.replace(/\/$/, ''));
        }
      }
      // Join path parts, avoiding double slashes
      let result = parts[0] || '';
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]!;
        if (result.endsWith('/')) {
          result += part;
        } else {
          result += `/${part}`;
        }
      }
      this.uri = result;
    }

    get exists() {
      return mockFs.files.has(this.uri);
    }

    get size() {
      return mockFs.files.get(this.uri)?.size ?? 0;
    }

    async base64() {
      const file = mockFs.files.get(this.uri);
      if (!file) throw new Error(`File not found: ${this.uri}`);
      return file.content;
    }

    copy(destination: MockFile | MockDirectory) {
      const src = mockFs.files.get(this.uri);
      if (!src) throw new Error(`Source file not found: ${this.uri}`);
      const destUri =
        destination instanceof MockDirectory
          ? `${destination.uri.replace(/\/$/, '')}/${this.uri.split('/').pop()}`
          : destination.uri;
      mockFs.files.set(destUri, { ...src });
    }

    delete() {
      if (!mockFs.files.has(this.uri)) {
        throw new Error(`File not found: ${this.uri}`);
      }
      mockFs.files.delete(this.uri);
    }

    create() {
      mockFs.files.set(this.uri, { content: '', size: 0 });
    }
  }

  class MockDirectory {
    uri: string;
    constructor(...uris: (string | MockFile | MockDirectory)[]) {
      const parts: string[] = [];
      for (const u of uris) {
        if (typeof u === 'string') {
          parts.push(u.replace(/\/$/, ''));
        } else {
          parts.push(u.uri.replace(/\/$/, ''));
        }
      }
      let result = parts[0] || '';
      for (let i = 1; i < parts.length; i++) {
        const part = parts[i]!;
        if (result.endsWith('/')) {
          result += part;
        } else {
          result += `/${part}`;
        }
      }
      this.uri = result.endsWith('/') ? result : `${result}/`;
    }

    get exists() {
      // A directory exists if explicitly registered or has any children
      const normalized = this.uri.endsWith('/') ? this.uri : `${this.uri}/`;
      if (mockFs.directories.has(normalized)) return true;
      for (const key of mockFs.files.keys()) {
        if (key.startsWith(normalized)) return true;
      }
      for (const key of mockFs.directories) {
        if (key.startsWith(normalized) && key !== normalized) return true;
      }
      return false;
    }

    get size() {
      return mockFs.totalSize(this.uri);
    }

    create(_options?: { intermediates?: boolean; idempotent?: boolean }) {
      const normalized = this.uri.endsWith('/') ? this.uri : `${this.uri}/`;
      mockFs.directories.add(normalized);
    }

    delete() {
      mockFs.deleteRecursive(this.uri);
    }

    list() {
      const entries = mockFs.listDir(this.uri);
      const normalized = this.uri.endsWith('/') ? this.uri : `${this.uri}/`;
      return entries.map((name) => {
        const childUri = `${normalized}${name}`;
        // Check if it's a directory
        const dirUri = `${childUri}/`;
        if (mockFs.directories.has(dirUri)) {
          return new MockDirectory(dirUri);
        }
        // Check if any files start with childUri/ (implicit directory)
        for (const key of mockFs.files.keys()) {
          if (key.startsWith(`${childUri}/`)) {
            return new MockDirectory(dirUri);
          }
        }
        // Check if any directories start with dirUri
        for (const key of mockFs.directories) {
          if (key.startsWith(dirUri) && key !== dirUri) {
            return new MockDirectory(dirUri);
          }
        }
        // It's a file
        return new MockFile(childUri);
      });
    }
  }

  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: {
      document: new MockDirectory(DOCUMENT_DIR),
    },
  };
});

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  saveFile,
  readFile,
  fileExists,
  deleteFile,
  deleteDocumentFiles,
  getDocumentFileSize,
  listDocuments,
  cleanupOrphanedFiles,
  cleanupTempFiles,
  getDocumentsBaseDir,
  getDocumentDir,
  getSubdirectory,
  getPageImageFile,
  getExportedPdfFile,
  getTempDir,
} from '../services/storage/fileStorage';

import {
  FileStorageError,
  FileWriteError,
  FileReadError,
} from '../services/storage/fileStorageErrors';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

const BASE = 'file:///data/user/0/com.fillit/files/';

describe('File Storage Service', () => {
  beforeEach(() => {
    mockFs.reset();
  });

  // ── Path Helpers ──────────────────────────────────────────────────

  describe('path helpers', () => {
    it('should return the base documents directory', () => {
      const dir = getDocumentsBaseDir();
      expect(dir.uri).toContain('documents');
    });

    it('should return a document-specific directory', () => {
      const dir = getDocumentDir('doc-123');
      expect(dir.uri).toContain('documents');
      expect(dir.uri).toContain('doc-123');
    });

    it('should return a subdirectory within a document', () => {
      const dir = getSubdirectory('doc-123', 'originals');
      expect(dir.uri).toContain('doc-123');
      expect(dir.uri).toContain('originals');
    });

    it('should return correct page image path for originals', () => {
      const file = getPageImageFile('doc-123', 1, 'originals');
      expect(file.uri).toContain('originals');
      expect(file.uri).toContain('page-1.jpg');
      expect(file.uri).not.toContain('enhanced');
    });

    it('should return correct page image path for processed', () => {
      const file = getPageImageFile('doc-123', 2, 'processed');
      expect(file.uri).toContain('processed');
      expect(file.uri).toContain('page-2-enhanced.jpg');
    });

    it('should return correct exported PDF path', () => {
      const file = getExportedPdfFile('doc-123');
      expect(file.uri).toContain('pdf');
      expect(file.uri).toContain('doc-123.pdf');
    });

    it('should return the temp directory', () => {
      const dir = getTempDir();
      expect(dir.uri).toContain('temp');
    });
  });

  // ── Path Traversal Protection ───────────────────────────────────

  describe('path traversal protection', () => {
    const maliciousIds = ['../../../etc', '..', 'foo/bar', 'foo\\bar', 'a\0b', ''];

    it.each(maliciousIds)('should reject malicious documentId: %s', (badId) => {
      expect(() => getDocumentDir(badId)).toThrow(FileStorageError);
    });

    it.each(maliciousIds)('should reject malicious documentId in getSubdirectory: %s', (badId) => {
      expect(() => getSubdirectory(badId, 'originals')).toThrow(FileStorageError);
    });

    it.each(maliciousIds)('should reject malicious documentId in getPageImageFile: %s', (badId) => {
      expect(() => getPageImageFile(badId, 1, 'originals')).toThrow(FileStorageError);
    });

    it('should reject malicious filename in saveFile', () => {
      const sourceUri = `${BASE}temp/scan.jpg`;
      mockFs.files.set(sourceUri, { content: 'data', size: 100 });

      expect(() => saveFile('doc-1', 'originals', '../secret.txt', sourceUri)).toThrow(
        FileStorageError,
      );
      expect(() => saveFile('doc-1', 'originals', 'foo/bar.jpg', sourceUri)).toThrow(
        FileStorageError,
      );
      expect(() => saveFile('doc-1', 'originals', '', sourceUri)).toThrow(FileStorageError);
    });
  });

  // ── saveFile ──────────────────────────────────────────────────────

  describe('saveFile', () => {
    it('should copy a source file to the target directory', () => {
      // Create a source file
      const sourceUri = `${BASE}temp/scan.jpg`;
      mockFs.files.set(sourceUri, { content: 'aW1hZ2VkYXRh', size: 1024 });

      const result = saveFile('doc-1', 'originals', 'page-1.jpg', sourceUri);

      expect(result).toContain('doc-1');
      expect(result).toContain('originals');
      expect(result).toContain('page-1.jpg');
      expect(mockFs.files.has(result)).toBe(true);
    });

    it('should create directory structure if it does not exist', () => {
      const sourceUri = `${BASE}temp/scan.jpg`;
      mockFs.files.set(sourceUri, { content: 'data', size: 512 });

      saveFile('doc-new', 'originals', 'page-1.jpg', sourceUri);

      // Directory should have been created
      const docDir = `${BASE}documents/doc-new/originals/`;
      expect(mockFs.directories.has(docDir)).toBe(true);
    });

    it('should overwrite existing target file', () => {
      const sourceUri = `${BASE}temp/scan.jpg`;
      mockFs.files.set(sourceUri, { content: 'bmV3ZGF0YQ==', size: 2048 });

      // Create existing target
      const targetUri = `${BASE}documents/doc-1/originals/page-1.jpg`;
      mockFs.files.set(targetUri, { content: 'b2xkZGF0YQ==', size: 1024 });

      saveFile('doc-1', 'originals', 'page-1.jpg', sourceUri);

      // Should have the new content
      expect(mockFs.files.get(targetUri)?.content).toBe('bmV3ZGF0YQ==');
    });

    it('should throw FileWriteError when source does not exist', () => {
      expect(() => saveFile('doc-1', 'originals', 'page.jpg', `${BASE}nonexistent.jpg`)).toThrow(
        FileWriteError,
      );
    });
  });

  // ── readFile ──────────────────────────────────────────────────────

  describe('readFile', () => {
    it('should return file contents as base64', async () => {
      const uri = `${BASE}documents/doc-1/originals/page-1.jpg`;
      mockFs.files.set(uri, { content: 'aW1hZ2VkYXRh', size: 1024 });

      const result = await readFile(uri);
      expect(result).toBe('aW1hZ2VkYXRh');
    });

    it('should throw FileReadError when file does not exist', async () => {
      await expect(readFile(`${BASE}nonexistent.jpg`)).rejects.toThrow(FileReadError);
    });
  });

  // ── fileExists ────────────────────────────────────────────────────

  describe('fileExists', () => {
    it('should return true when file exists', () => {
      const uri = `${BASE}documents/doc-1/originals/page-1.jpg`;
      mockFs.files.set(uri, { content: 'data', size: 100 });

      expect(fileExists(uri)).toBe(true);
    });

    it('should return false when file does not exist', () => {
      expect(fileExists(`${BASE}nonexistent.jpg`)).toBe(false);
    });
  });

  // ── deleteFile ────────────────────────────────────────────────────

  describe('deleteFile', () => {
    it('should delete an existing file', () => {
      const uri = `${BASE}documents/doc-1/originals/page-1.jpg`;
      mockFs.files.set(uri, { content: 'data', size: 100 });

      deleteFile(uri);
      expect(mockFs.files.has(uri)).toBe(false);
    });

    it('should be a no-op for non-existent file', () => {
      expect(() => deleteFile(`${BASE}nonexistent.jpg`)).not.toThrow();
    });
  });

  // ── deleteDocumentFiles ───────────────────────────────────────────

  describe('deleteDocumentFiles', () => {
    it('should delete all files for a document', () => {
      const prefix = `${BASE}documents/doc-1/`;
      mockFs.files.set(`${prefix}originals/page-1.jpg`, { content: 'a', size: 100 });
      mockFs.files.set(`${prefix}originals/page-2.jpg`, { content: 'b', size: 200 });
      mockFs.files.set(`${prefix}processed/page-1-enhanced.jpg`, { content: 'c', size: 150 });
      mockFs.directories.add(`${prefix}`);

      deleteDocumentFiles('doc-1');

      expect(mockFs.files.size).toBe(0);
    });

    it('should be a no-op for non-existent document', () => {
      expect(() => deleteDocumentFiles('nonexistent')).not.toThrow();
    });
  });

  // ── getDocumentFileSize ───────────────────────────────────────────

  describe('getDocumentFileSize', () => {
    it('should return total size of document files', () => {
      const prefix = `${BASE}documents/doc-1/`;
      mockFs.files.set(`${prefix}originals/page-1.jpg`, { content: 'a', size: 1000 });
      mockFs.files.set(`${prefix}originals/page-2.jpg`, { content: 'b', size: 2000 });
      mockFs.directories.add(`${prefix}`);

      expect(getDocumentFileSize('doc-1')).toBe(3000);
    });

    it('should return 0 for non-existent document', () => {
      expect(getDocumentFileSize('nonexistent')).toBe(0);
    });
  });

  // ── listDocuments ─────────────────────────────────────────────────

  describe('listDocuments', () => {
    it('should return empty array when no documents exist', () => {
      expect(listDocuments()).toEqual([]);
    });

    it('should list all documents with file info', () => {
      const base = `${BASE}documents/`;
      mockFs.directories.add(base);
      mockFs.directories.add(`${base}doc-1/`);
      mockFs.directories.add(`${base}doc-2/`);
      mockFs.files.set(`${base}doc-1/originals/page-1.jpg`, { content: 'a', size: 1000 });
      mockFs.files.set(`${base}doc-1/originals/page-2.jpg`, { content: 'b', size: 2000 });
      mockFs.files.set(`${base}doc-2/originals/page-1.jpg`, { content: 'c', size: 500 });

      const docs = listDocuments();
      expect(docs).toHaveLength(2);

      const doc1 = docs.find((d) => d.documentId === 'doc-1');
      expect(doc1).toBeDefined();
      expect(doc1!.fileCount).toBe(2);
      expect(doc1!.totalSize).toBe(3000);

      const doc2 = docs.find((d) => d.documentId === 'doc-2');
      expect(doc2).toBeDefined();
      expect(doc2!.fileCount).toBe(1);
      expect(doc2!.totalSize).toBe(500);
    });
  });

  // ── cleanupOrphanedFiles ──────────────────────────────────────────

  describe('cleanupOrphanedFiles', () => {
    it('should delete directories not in the known IDs list', () => {
      const base = `${BASE}documents/`;
      mockFs.directories.add(base);
      mockFs.directories.add(`${base}doc-1/`);
      mockFs.directories.add(`${base}doc-2/`);
      mockFs.directories.add(`${base}doc-orphan/`);
      mockFs.files.set(`${base}doc-1/originals/page-1.jpg`, { content: 'a', size: 100 });
      mockFs.files.set(`${base}doc-orphan/originals/page-1.jpg`, { content: 'b', size: 200 });

      const count = cleanupOrphanedFiles(['doc-1', 'doc-2']);
      expect(count).toBe(1);
      // Orphan should be deleted
      expect(mockFs.directories.has(`${base}doc-orphan/`)).toBe(false);
      // Known docs should remain
      expect(mockFs.files.has(`${base}doc-1/originals/page-1.jpg`)).toBe(true);
    });

    it('should return 0 when no documents directory exists', () => {
      expect(cleanupOrphanedFiles(['doc-1'])).toBe(0);
    });

    it('should return 0 when all directories are known', () => {
      const base = `${BASE}documents/`;
      mockFs.directories.add(base);
      mockFs.directories.add(`${base}doc-1/`);
      mockFs.files.set(`${base}doc-1/originals/page-1.jpg`, { content: 'a', size: 100 });

      expect(cleanupOrphanedFiles(['doc-1'])).toBe(0);
    });
  });

  // ── cleanupTempFiles ──────────────────────────────────────────────

  describe('cleanupTempFiles', () => {
    it('should delete all temp files and return count', () => {
      const tempDir = `${BASE}temp/`;
      mockFs.directories.add(tempDir);
      mockFs.files.set(`${tempDir}scan-001.jpg`, { content: 'a', size: 100 });
      mockFs.files.set(`${tempDir}scan-002.jpg`, { content: 'b', size: 200 });

      const count = cleanupTempFiles();
      expect(count).toBe(2);
    });

    it('should return 0 when temp directory does not exist', () => {
      expect(cleanupTempFiles()).toBe(0);
    });
  });
});
