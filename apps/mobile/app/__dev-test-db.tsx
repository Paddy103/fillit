/**
 * TEMPORARY DEV SCREEN — Delete before merging S-15.
 *
 * Exercises the SQLite database service on a real device to verify:
 * - Database initialization (WAL, foreign keys, migrations)
 * - Table creation (all 9 tables)
 * - Insert/query/delete roundtrip
 * - Cascading deletes
 * - Schema version tracking
 */

import { useState } from 'react';
import { ScrollView, Text, Pressable, StyleSheet, View } from 'react-native';
import {
  initializeDatabase,
  getSchemaVersion,
  runQuery,
  getFirst,
  getAll,
  closeDatabase,
  deleteDatabase,
} from '../src/services/storage/database';

type TestResult = { name: string; status: 'pass' | 'fail'; detail: string };

export default function DevTestDbScreen() {
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

    try {
      // Clean slate
      try {
        await deleteDatabase();
      } catch {
        // ignore if not exists
      }

      // Test 1: Initialize database
      try {
        await initializeDatabase();
        pass('Initialize database');
      } catch (e: unknown) {
        fail('Initialize database', String(e));
        setRunning(false);
        return;
      }

      // Test 2: Schema version
      try {
        const version = await getSchemaVersion();
        if (version >= 1) {
          pass('Schema version', `v${version}`);
        } else {
          fail('Schema version', `Expected >= 1, got ${version}`);
        }
      } catch (e: unknown) {
        fail('Schema version', String(e));
      }

      // Test 3: Verify all 9 tables exist
      const tables = [
        'profiles',
        'addresses',
        'identity_documents',
        'professional_registrations',
        'emergency_contacts',
        'documents',
        'document_pages',
        'detected_fields',
        'signatures',
      ];
      try {
        const rows = await getAll<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name != '_schema_version'",
        );
        const tableNames = rows.map((r) => r.name);
        const missing = tables.filter((t) => !tableNames.includes(t));
        if (missing.length === 0) {
          pass('All 9 tables exist', tableNames.join(', '));
        } else {
          fail('All 9 tables exist', `Missing: ${missing.join(', ')}`);
        }
      } catch (e: unknown) {
        fail('All 9 tables exist', String(e));
      }

      // Test 4: Insert a profile
      const profileId = 'test-' + Date.now();
      const now = new Date().toISOString();
      try {
        await runQuery(
          `INSERT INTO profiles (id, is_primary, first_name, last_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [profileId, 1, 'Test', 'User', now, now],
        );
        pass('Insert profile');
      } catch (e: unknown) {
        fail('Insert profile', String(e));
      }

      // Test 5: Query the profile back
      try {
        const row = await getFirst<{ id: string; first_name: string }>(
          'SELECT id, first_name FROM profiles WHERE id = ?',
          [profileId],
        );
        if (row && row.first_name === 'Test') {
          pass('Query profile', `id=${row.id}, first_name=${row.first_name}`);
        } else {
          fail('Query profile', `Unexpected: ${JSON.stringify(row)}`);
        }
      } catch (e: unknown) {
        fail('Query profile', String(e));
      }

      // Test 6: Insert an address (child of profile)
      const addressId = 'addr-' + Date.now();
      try {
        await runQuery(
          `INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [addressId, profileId, 'Home', '123 Main St', 'Cape Town', 'Western Cape', '8001'],
        );
        pass('Insert address (child)');
      } catch (e: unknown) {
        fail('Insert address (child)', String(e));
      }

      // Test 7: Cascading delete — delete profile should delete address
      try {
        await runQuery('DELETE FROM profiles WHERE id = ?', [profileId]);
        const addr = await getFirst('SELECT id FROM addresses WHERE id = ?', [addressId]);
        if (addr === null) {
          pass('Cascade delete', 'Address deleted with profile');
        } else {
          fail('Cascade delete', 'Address still exists after profile delete');
        }
      } catch (e: unknown) {
        fail('Cascade delete', String(e));
      }

      // Test 8: Foreign key enforcement
      try {
        await runQuery(
          `INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['orphan-addr', 'nonexistent-profile', 'Bad', '1 X', 'X', 'X', '0000'],
        );
        fail('FK enforcement', 'Insert with bad profile_id should have failed');
      } catch {
        pass('FK enforcement', 'Rejected insert with nonexistent profile_id');
      }

      // Cleanup
      await closeDatabase();
      await deleteDatabase();
      pass('Cleanup', 'Database deleted');
    } catch (e: unknown) {
      fail('Unexpected error', String(e));
    }

    setRunning(false);
  }

  const passCount = results.filter((r) => r.status === 'pass').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>S-15: SQLite Database Tests</Text>
      <Text style={styles.subtitle}>Runs on-device to verify real SQLite behavior</Text>

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
    backgroundColor: '#2563eb',
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
