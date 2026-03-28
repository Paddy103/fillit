/**
 * SQLite Database Service
 *
 * Manages the local SQLite database for the FillIt application using expo-sqlite.
 * Handles database initialization, schema migrations, and provides type-safe
 * query helpers with encryption/decryption support for sensitive fields.
 *
 * Tables: profiles, addresses, identity_documents, professional_registrations,
 * emergency_contacts, documents, document_pages, detected_fields, signatures.
 */

import * as SQLite from 'expo-sqlite';

import {
  DatabaseError,
  DatabaseInitError,
  MigrationError,
  QueryError,
  TransactionError,
} from './databaseErrors';
import { migrations } from './migrations';

const DATABASE_NAME = 'fillit.db';

/** Schema version tracking table name. */
const SCHEMA_VERSION_TABLE = '_schema_version';

/** Singleton database instance. */
let db: SQLite.SQLiteDatabase | null = null;

/** Shared promise to prevent concurrent initialization. */
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get the database instance. Throws if not initialized.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new DatabaseInitError('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Initialize the SQLite database and run pending migrations.
 *
 * Opens (or creates) the database file, enables WAL mode and foreign keys,
 * creates the schema version tracking table, and applies any pending migrations.
 *
 * Safe to call concurrently — subsequent calls share the same initialization promise.
 * Must be called once during app startup before any database operations.
 *
 * @returns The initialized database instance.
 * @throws {DatabaseInitError} If the database cannot be opened or configured.
 * @throws {MigrationError} If a migration fails to apply.
 */
export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = doInitializeDatabase();
  try {
    return await initPromise;
  } catch (error) {
    // Reset so retry is possible after failure
    initPromise = null;
    throw error;
  }
}

async function doInitializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    // Enable WAL mode for better concurrent read/write performance
    await db.execAsync('PRAGMA journal_mode = WAL');

    // Enable foreign key constraints (off by default in SQLite)
    await db.execAsync('PRAGMA foreign_keys = ON');

    // Create the schema version tracking table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${SCHEMA_VERSION_TABLE} (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        version INTEGER NOT NULL DEFAULT 0,
        applied_at TEXT NOT NULL
      )
    `);

    // Initialize version row if not present
    await db.runAsync(
      `INSERT OR IGNORE INTO ${SCHEMA_VERSION_TABLE} (id, version, applied_at) VALUES (1, 0, ?)`,
      new Date().toISOString(),
    );

    // Run pending migrations
    await runMigrations();

    // Verify critical tables exist (handles stale schema version from prior installs)
    const tableCheck = await db.getFirstAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='profiles'",
    );
    if (!tableCheck) {
      console.warn('[FillIt] Schema version is set but tables are missing — forcing re-migration');
      await db.runAsync(
        `UPDATE ${SCHEMA_VERSION_TABLE} SET version = 0, applied_at = ? WHERE id = 1`,
        new Date().toISOString(),
      );
      await runMigrations();
    }

    return db;
  } catch (error) {
    // Reset singleton on failure so retry is possible
    db = null;
    if (error instanceof MigrationError) {
      throw error;
    }
    throw new DatabaseInitError('Failed to initialize database', error);
  }
}

/**
 * Get the current schema version.
 */
export async function getSchemaVersion(): Promise<number> {
  const database = getDatabase();
  const row = await database.getFirstAsync<{ version: number }>(
    `SELECT version FROM ${SCHEMA_VERSION_TABLE} WHERE id = 1`,
  );
  return row?.version ?? 0;
}

/**
 * Apply all pending migrations in sequence.
 *
 * Each migration runs inside a transaction. If any statement within a
 * migration fails, the entire migration is rolled back and the error is thrown.
 */
async function runMigrations(): Promise<void> {
  const database = getDatabase();
  const currentVersion = await getSchemaVersion();

  const pending = migrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) {
    return;
  }

  for (const migration of pending) {
    try {
      await database.withTransactionAsync(async () => {
        for (const sql of migration.statements) {
          await database.execAsync(sql);
        }

        await database.runAsync(
          `UPDATE ${SCHEMA_VERSION_TABLE} SET version = ?, applied_at = ? WHERE id = 1`,
          migration.version,
          new Date().toISOString(),
        );
      });
    } catch (error) {
      throw new MigrationError(migration.version, `Failed to apply migration`, error);
    }
  }
}

// ─── Query Helpers ──────────────────────────────────────────────────

/**
 * Execute a parameterized INSERT, UPDATE, or DELETE statement.
 *
 * @returns The result containing `lastInsertRowId` and `changes`.
 */
export async function runQuery(
  sql: string,
  params?: SQLite.SQLiteBindParams,
): Promise<SQLite.SQLiteRunResult> {
  try {
    const database = getDatabase();
    if (params) {
      return await database.runAsync(sql, params);
    }
    return await database.runAsync(sql);
  } catch (error) {
    throw new QueryError('Query execution failed', error);
  }
}

/**
 * Fetch a single row from a parameterized SELECT query.
 *
 * @returns The first matching row, or `null` if no rows match.
 */
export async function getFirst<T>(
  sql: string,
  params?: SQLite.SQLiteBindParams,
): Promise<T | null> {
  try {
    const database = getDatabase();
    if (params) {
      return await database.getFirstAsync<T>(sql, params);
    }
    return await database.getFirstAsync<T>(sql);
  } catch (error) {
    throw new QueryError('Query execution failed', error);
  }
}

/**
 * Fetch all rows from a parameterized SELECT query.
 *
 * @returns An array of matching rows.
 */
export async function getAll<T>(sql: string, params?: SQLite.SQLiteBindParams): Promise<T[]> {
  try {
    const database = getDatabase();
    if (params) {
      return await database.getAllAsync<T>(sql, params);
    }
    return await database.getAllAsync<T>(sql);
  } catch (error) {
    throw new QueryError('Query execution failed', error);
  }
}

/**
 * Execute multiple operations inside a single transaction.
 *
 * If the callback throws, the transaction is rolled back.
 */
export async function withTransaction(callback: () => Promise<void>): Promise<void> {
  try {
    const database = getDatabase();
    await database.withTransactionAsync(callback);
  } catch (error) {
    if (error instanceof DatabaseError) {
      throw error;
    }
    throw new TransactionError('Transaction failed', error);
  }
}

/**
 * Close the database connection and reset the singleton.
 *
 * Call this during app shutdown or when the database is no longer needed.
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
    } finally {
      db = null;
    }
  }
}

/**
 * Delete the database and reset the singleton.
 *
 * This permanently deletes all data. Use with caution.
 */
export async function deleteDatabase(): Promise<void> {
  if (db) {
    try {
      await db.closeAsync();
    } finally {
      db = null;
    }
  }
  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
}

// ─── Exports for testing ────────────────────────────────────────────

/** @internal Exposed for testing only. */
export const _testing = {
  DATABASE_NAME,
  SCHEMA_VERSION_TABLE,
  resetInstance: () => {
    db = null;
    initPromise = null;
  },
};
