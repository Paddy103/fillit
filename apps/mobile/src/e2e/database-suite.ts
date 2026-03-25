/**
 * E2E test suite for SQLite database service (S-15).
 *
 * Exercises: init, schema version, table creation, insert/query,
 * cascade delete, FK enforcement.
 */

import {
  initializeDatabase,
  getSchemaVersion,
  runQuery,
  getFirst,
  getAll,
  closeDatabase,
  deleteDatabase,
} from '../services/storage/database';

import { type TestResult, pass, fail } from './types';

export async function runDatabaseTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    await deleteDatabase().catch(() => {});

    // Test 1: Initialize
    try {
      await initializeDatabase();
      results.push(pass('Initialize database'));
    } catch (e) {
      results.push(fail('Initialize database', String(e)));
      return results;
    }

    // Test 2: Schema version
    try {
      const version = await getSchemaVersion();
      results.push(
        version >= 1
          ? pass('Schema version', `v${version}`)
          : fail('Schema version', `Expected >= 1, got ${version}`),
      );
    } catch (e) {
      results.push(fail('Schema version', String(e)));
    }

    // Test 3: All 9 tables exist
    try {
      const rows = await getAll<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name != '_schema_version'",
      );
      const tableNames = rows.map((r) => r.name);
      const expected = [
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
      const missing = expected.filter((t) => !tableNames.includes(t));
      results.push(
        missing.length === 0
          ? pass('All 9 tables exist', tableNames.join(', '))
          : fail('All 9 tables exist', `Missing: ${missing.join(', ')}`),
      );
    } catch (e) {
      results.push(fail('All 9 tables exist', String(e)));
    }

    // Test 4: Insert profile
    const profileId = 'e2e-' + Date.now();
    const now = new Date().toISOString();
    try {
      await runQuery(
        'INSERT INTO profiles (id, is_primary, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [profileId, 1, 'E2E', 'Test', now, now],
      );
      results.push(pass('Insert profile'));
    } catch (e) {
      results.push(fail('Insert profile', String(e)));
    }

    // Test 5: Query profile
    try {
      const row = await getFirst<{ id: string; first_name: string }>(
        'SELECT id, first_name FROM profiles WHERE id = ?',
        [profileId],
      );
      results.push(
        row?.first_name === 'E2E'
          ? pass('Query profile', `first_name=${row.first_name}`)
          : fail('Query profile', `Unexpected: ${JSON.stringify(row)}`),
      );
    } catch (e) {
      results.push(fail('Query profile', String(e)));
    }

    // Test 6: Cascade delete
    const addressId = 'e2e-addr-' + Date.now();
    try {
      await runQuery(
        'INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [addressId, profileId, 'Home', '1 Test St', 'Cape Town', 'Western Cape', '8001'],
      );
      await runQuery('DELETE FROM profiles WHERE id = ?', [profileId]);
      const addr = await getFirst('SELECT id FROM addresses WHERE id = ?', [addressId]);
      results.push(
        addr === null
          ? pass('Cascade delete', 'Address deleted with profile')
          : fail('Cascade delete', 'Address still exists'),
      );
    } catch (e) {
      results.push(fail('Cascade delete', String(e)));
    }

    // Test 7: FK enforcement
    try {
      await runQuery(
        'INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['orphan', 'nonexistent', 'Bad', '1 X', 'X', 'X', '0000'],
      );
      results.push(fail('FK enforcement', 'Should have rejected bad profile_id'));
    } catch {
      results.push(pass('FK enforcement', 'Rejected nonexistent profile_id'));
    }

    // Cleanup
    await closeDatabase();
    await deleteDatabase();
    results.push(pass('Cleanup'));
  } catch (e) {
    results.push(fail('Unexpected error', String(e)));
  }

  return results;
}
