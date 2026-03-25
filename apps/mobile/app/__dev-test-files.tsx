/**
 * TEMPORARY DEV SCREEN — Delete before merging S-21.
 *
 * Exercises the file storage service on a real device to verify:
 * - Directory creation
 * - File save (copy) and read (base64) roundtrip
 * - File existence check
 * - File deletion
 * - Document directory deletion
 * - File size tracking
 * - Orphan cleanup
 * - Path traversal rejection
 */

import { useState } from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';
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
  getDocumentsBaseDir,
  getTempDir,
} from '../src/services/storage/fileStorage';
import { FileStorageError } from '../src/services/storage/fileStorageErrors';

type TestResult = { name: string; status: 'pass' | 'fail'; detail: string };

export default function DevTestFilesScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  async function runTests() {
    setRunning(true);
    setResults([]);
    const out: TestResult[] = [];

    function pass(name: string, detail = '') {
      out.push({ name, status: 'pass', detail });
      setResults([...out]);
    }
    function fail(name: string, detail: string) {
      out.push({ name, status: 'fail', detail });
      setResults([...out]);
    }

    const docId = 'test-' + Date.now();

    try {
      // Cleanup any leftover test data
      try {
        deleteDocumentFiles(docId);
      } catch {
        // ignore
      }

      // Test 1: Paths are available
      try {
        const baseDir = getDocumentsBaseDir();
        const tempDir = getTempDir();
        if (baseDir.uri && tempDir.uri) {
          pass('Paths available', `base: ${baseDir.uri}`);
        } else {
          fail('Paths available', 'URI is null');
        }
      } catch (e: unknown) {
        fail('Paths available', String(e));
      }

      // Test 2: Create a temp source file, then save it
      let savedUri = '';
      try {
        // Create a source file with known content
        const tempDir = getTempDir();
        tempDir.create({ intermediates: true, idempotent: true });
        const sourceFile = new File(tempDir, 'test-source.txt');
        sourceFile.write('Hello from FillIt dev test!');

        savedUri = saveFile(docId, 'originals', 'page-1.txt', sourceFile.uri);
        if (savedUri && savedUri.includes(docId)) {
          pass('Save file', savedUri.split('/').slice(-3).join('/'));
        } else {
          fail('Save file', `Unexpected URI: ${savedUri}`);
        }

        // Clean up source
        sourceFile.delete();
      } catch (e: unknown) {
        fail('Save file', String(e));
      }

      // Test 3: File exists
      if (savedUri) {
        try {
          const exists = fileExists(savedUri);
          if (exists) {
            pass('File exists check', 'true');
          } else {
            fail('File exists check', 'File not found after save');
          }
        } catch (e: unknown) {
          fail('File exists check', String(e));
        }
      }

      // Test 4: Read file back
      if (savedUri) {
        try {
          const base64 = await readFile(savedUri);
          if (base64 && base64.length > 0) {
            pass('Read file (base64)', `${base64.length} chars`);
          } else {
            fail('Read file (base64)', 'Empty content');
          }
        } catch (e: unknown) {
          fail('Read file (base64)', String(e));
        }
      }

      // Test 5: File size tracking
      try {
        const size = getDocumentFileSize(docId);
        if (size > 0) {
          pass('File size', `${size} bytes`);
        } else {
          fail('File size', `Expected > 0, got ${size}`);
        }
      } catch (e: unknown) {
        fail('File size', String(e));
      }

      // Test 6: List documents
      try {
        const docs = listDocuments();
        const found = docs.find((d) => d.documentId === docId);
        if (found) {
          pass(
            'List documents',
            `Found ${docId} with ${found.fileCount} files, ${found.totalSize}B`,
          );
        } else {
          fail('List documents', `Document ${docId} not in list`);
        }
      } catch (e: unknown) {
        fail('List documents', String(e));
      }

      // Test 7: Delete single file
      if (savedUri) {
        try {
          deleteFile(savedUri);
          const exists = fileExists(savedUri);
          if (!exists) {
            pass('Delete file', 'File removed');
          } else {
            fail('Delete file', 'File still exists after delete');
          }
        } catch (e: unknown) {
          fail('Delete file', String(e));
        }
      }

      // Test 8: Delete document files (create another file first)
      try {
        const tempDir = getTempDir();
        tempDir.create({ intermediates: true, idempotent: true });
        const src = new File(tempDir, 'test2.txt');
        src.write('test data');
        saveFile(docId, 'processed', 'page-1-enhanced.txt', src.uri);
        src.delete();

        deleteDocumentFiles(docId);
        const size = getDocumentFileSize(docId);
        if (size === 0) {
          pass('Delete document files', 'All files removed');
        } else {
          fail('Delete document files', `${size} bytes still remain`);
        }
      } catch (e: unknown) {
        fail('Delete document files', String(e));
      }

      // Test 9: Orphan cleanup
      try {
        // Create an orphan directory
        const tempDir = getTempDir();
        tempDir.create({ intermediates: true, idempotent: true });
        const src = new File(tempDir, 'orphan.txt');
        src.write('orphan data');
        saveFile('orphan-doc-999', 'originals', 'page.txt', src.uri);
        src.delete();

        const deleted = cleanupOrphanedFiles([]); // no known IDs = everything is orphan
        if (deleted >= 1) {
          pass('Orphan cleanup', `Deleted ${deleted} orphan(s)`);
        } else {
          fail('Orphan cleanup', `Expected >= 1 deleted, got ${deleted}`);
        }
      } catch (e: unknown) {
        fail('Orphan cleanup', String(e));
      }

      // Test 10: Path traversal rejection
      try {
        let blocked = false;
        try {
          saveFile('../../../evil', 'originals', 'hack.txt', 'file:///doesntmatter');
        } catch (e) {
          if (e instanceof FileStorageError) blocked = true;
        }
        if (blocked) {
          pass('Path traversal blocked', 'Rejected ../../../evil');
        } else {
          fail('Path traversal blocked', 'Should have thrown FileStorageError');
        }
      } catch (e: unknown) {
        fail('Path traversal blocked', String(e));
      }
    } catch (e: unknown) {
      fail('Unexpected error', String(e));
    }

    setRunning(false);
  }

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>S-21: File Storage Tests</Text>
      <Text style={styles.subtitle}>Runs on-device to verify real filesystem behavior</Text>

      <Pressable
        style={[styles.button, running && styles.buttonDisabled]}
        onPress={runTests}
        disabled={running}
      >
        <Text style={styles.buttonText}>{running ? 'Running...' : 'Run Tests'}</Text>
      </Pressable>

      {results.length > 0 && (
        <Text style={styles.summary}>
          {passCount} passed, {failCount} failed
        </Text>
      )}

      {results.map((r, i) => (
        <View key={i} style={[styles.result, r.status === 'fail' && styles.resultFail]}>
          <Text style={styles.resultStatus}>{r.status === 'pass' ? '\u2705' : '\u274C'}</Text>
          <View style={styles.resultText}>
            <Text style={styles.resultName}>{r.name}</Text>
            {r.detail ? <Text style={styles.resultDetail}>{r.detail}</Text> : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  button: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  summary: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  result: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultFail: { backgroundColor: '#fef2f2' },
  resultStatus: { fontSize: 18, marginRight: 8, width: 28 },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '500' },
  resultDetail: { fontSize: 13, color: '#666', marginTop: 2 },
});
