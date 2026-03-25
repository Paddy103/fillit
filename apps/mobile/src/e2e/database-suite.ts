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

const EXPECTED_TABLES = [
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

async function testSchemaVersion(): Promise<TestResult> {
  const version = await getSchemaVersion();
  return version >= 1
    ? pass('Schema version', `v${version}`)
    : fail('Schema version', `Expected >= 1, got ${version}`);
}

async function testTablesExist(): Promise<TestResult> {
  const rows = await getAll<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name != '_schema_version'",
  );
  const tableNames = rows.map((r) => r.name);
  const missing = EXPECTED_TABLES.filter((t) => !tableNames.includes(t));
  return missing.length === 0
    ? pass('All 9 tables exist', tableNames.join(', '))
    : fail('All 9 tables exist', `Missing: ${missing.join(', ')}`);
}

async function testInsertAndQuery(profileId: string, now: string): Promise<TestResult[]> {
  const results: TestResult[] = [];

  await runQuery(
    'INSERT INTO profiles (id, is_primary, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [profileId, 1, 'E2E', 'Test', now, now],
  );
  results.push(pass('Insert profile'));

  const row = await getFirst<{ id: string; first_name: string }>(
    'SELECT id, first_name FROM profiles WHERE id = ?',
    [profileId],
  );
  results.push(
    row?.first_name === 'E2E'
      ? pass('Query profile', `first_name=${row.first_name}`)
      : fail('Query profile', `Unexpected: ${JSON.stringify(row)}`),
  );

  return results;
}

async function testCascadeDelete(profileId: string): Promise<TestResult> {
  const addressId = 'e2e-addr-' + Date.now();
  await runQuery(
    'INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [addressId, profileId, 'Home', '1 Test St', 'Cape Town', 'Western Cape', '8001'],
  );
  await runQuery('DELETE FROM profiles WHERE id = ?', [profileId]);
  const addr = await getFirst('SELECT id FROM addresses WHERE id = ?', [addressId]);
  return addr === null
    ? pass('Cascade delete', 'Address deleted with profile')
    : fail('Cascade delete', 'Address still exists');
}

async function testFKEnforcement(): Promise<TestResult> {
  try {
    await runQuery(
      'INSERT INTO addresses (id, profile_id, label, street1, city, province, postal_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['orphan', 'nonexistent', 'Bad', '1 X', 'X', 'X', '0000'],
    );
    return fail('FK enforcement', 'Should have rejected bad profile_id');
  } catch {
    return pass('FK enforcement', 'Rejected nonexistent profile_id');
  }
}

export async function runDatabaseTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    await deleteDatabase().catch(() => {});

    try {
      await initializeDatabase();
      results.push(pass('Initialize database'));
    } catch (e) {
      results.push(fail('Initialize database', String(e)));
      return results;
    }

    results.push(await testSchemaVersion());
    results.push(await testTablesExist());

    const profileId = 'e2e-' + Date.now();
    results.push(...(await testInsertAndQuery(profileId, new Date().toISOString())));
    results.push(await testCascadeDelete(profileId));
    results.push(await testFKEnforcement());

    await closeDatabase();
    await deleteDatabase();
    results.push(pass('Cleanup'));
  } catch (e) {
    results.push(fail('Unexpected error', String(e)));
  }

  return results;
}
