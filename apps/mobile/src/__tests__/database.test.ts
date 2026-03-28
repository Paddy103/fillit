import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockDb, mockOpenDatabase, mockDeleteDatabase } = vi.hoisted(() => {
  /** In-memory table store keyed by table name. */
  const tables = new Map<string, { columns: string[]; rows: Record<string, unknown>[] }>();

  /** Track executed SQL for assertion. */
  const executedSql: string[] = [];

  /** Schema version state. */
  let schemaVersion = 0;

  const mockDb = {
    execAsync: vi.fn(async (sql: string) => {
      executedSql.push(sql);

      // Parse CREATE TABLE statements to track tables
      const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
      if (!createMatch || tables.has(createMatch[1]!)) return;

      const tableName = createMatch[1]!;
      const colSection = sql.match(/\(([\s\S]+)\)/);
      const columns: string[] = [];
      if (colSection) {
        const skipPrefixes = ['FOREIGN', 'CHECK', 'UNIQUE', 'PRIMARY', 'CONSTRAINT'];
        const lines = colSection[1]!.split(',').map((l) => l.trim());
        for (const line of lines) {
          const colName = line.split(/\s+/)[0];
          if (colName && !skipPrefixes.some((p) => colName.startsWith(p))) {
            columns.push(colName);
          }
        }
      }
      tables.set(tableName, { columns, rows: [] });
    }),

    runAsync: vi.fn(async (sql: string, ...args: unknown[]) => {
      executedSql.push(sql);

      // Handle schema version inserts
      if (sql.includes('INSERT OR IGNORE INTO _schema_version')) {
        return { lastInsertRowId: 1, changes: schemaVersion === 0 ? 1 : 0 };
      }

      // Handle schema version updates
      if (sql.includes('UPDATE _schema_version SET version')) {
        schemaVersion = (args[0] as number) || 0;
        return { lastInsertRowId: 1, changes: 1 };
      }

      // Handle generic INSERT
      const insertMatch = sql.match(/INSERT INTO (\w+)/i);
      if (insertMatch) {
        const tableName = insertMatch[1]!;
        const table = tables.get(tableName);
        if (table) {
          const row: Record<string, unknown> = {};
          // Map positional params to columns
          const params = Array.isArray(args[0]) ? args[0] : args;
          table.columns.forEach((col, i) => {
            row[col] = params[i] ?? null;
          });
          table.rows.push(row);
          return { lastInsertRowId: table.rows.length, changes: 1 };
        }
      }

      return { lastInsertRowId: 0, changes: 0 };
    }),

    getFirstAsync: vi.fn(async (sql: string) => {
      executedSql.push(sql);

      // Handle schema version query
      if (sql.includes('SELECT version FROM _schema_version')) {
        return { version: schemaVersion };
      }

      // Handle table existence check (sqlite_master) — return matching tracked table
      if (sql.includes('sqlite_master') && sql.includes("type='table'")) {
        const nameMatch = sql.match(/name='(\w+)'/);
        if (nameMatch && tables.has(nameMatch[1]!)) {
          return { name: nameMatch[1] };
        }
        return null;
      }

      // Handle generic SELECT from tracked tables
      const selectMatch = sql.match(/SELECT .+ FROM (\w+)/i);
      if (selectMatch) {
        const tableName = selectMatch[1]!;
        const table = tables.get(tableName);
        if (table && table.rows.length > 0) {
          return table.rows[0];
        }
      }

      return null;
    }),

    getAllAsync: vi.fn(async (sql: string) => {
      executedSql.push(sql);

      const selectMatch = sql.match(/SELECT .+ FROM (\w+)/i);
      if (selectMatch) {
        const tableName = selectMatch[1]!;
        const table = tables.get(tableName);
        return table?.rows ?? [];
      }

      return [];
    }),

    withTransactionAsync: vi.fn(async (callback: () => Promise<void>) => {
      await callback();
    }),

    closeAsync: vi.fn(async () => {}),

    // Test helpers
    _tables: tables,
    _executedSql: executedSql,
    _getSchemaVersion: () => schemaVersion,
    _setSchemaVersion: (v: number) => {
      schemaVersion = v;
    },
    _reset: () => {
      tables.clear();
      executedSql.length = 0;
      schemaVersion = 0;
    },
  };

  return {
    mockDb,
    mockOpenDatabase: vi.fn(async () => mockDb),
    mockDeleteDatabase: vi.fn(async () => {}),
  };
});

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: mockOpenDatabase,
  deleteDatabaseAsync: mockDeleteDatabase,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  initializeDatabase,
  getDatabase,
  getSchemaVersion,
  runQuery,
  getFirst,
  getAll,
  withTransaction,
  closeDatabase,
  deleteDatabase,
  _testing,
} from '../services/storage/database';

import {
  DatabaseInitError,
  QueryError,
  TransactionError,
} from '../services/storage/databaseErrors';
import { migrations } from '../services/storage/migrations';

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Database Service', () => {
  beforeEach(() => {
    mockDb._reset();
    _testing.resetInstance();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    _testing.resetInstance();
  });

  // ── Initialization ──────────────────────────────────────────────────

  describe('initializeDatabase', () => {
    it('should open the database and return the instance', async () => {
      const result = await initializeDatabase();
      expect(result).toBeDefined();
      expect(mockOpenDatabase).toHaveBeenCalledWith('fillit.db');
    });

    it('should enable WAL journal mode', async () => {
      await initializeDatabase();
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA journal_mode = WAL');
    });

    it('should enable foreign key constraints', async () => {
      await initializeDatabase();
      expect(mockDb.execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON');
    });

    it('should create the schema version table', async () => {
      await initializeDatabase();
      const createVersionTable = mockDb.execAsync.mock.calls.find(([sql]: [string]) =>
        sql.includes('_schema_version'),
      );
      expect(createVersionTable).toBeDefined();
    });

    it('should return the same instance on subsequent calls', async () => {
      const first = await initializeDatabase();
      const second = await initializeDatabase();
      expect(first).toBe(second);
      expect(mockOpenDatabase).toHaveBeenCalledTimes(1);
    });

    it('should throw DatabaseInitError if opening fails', async () => {
      mockOpenDatabase.mockRejectedValueOnce(new Error('disk full'));
      await expect(initializeDatabase()).rejects.toThrow(DatabaseInitError);
    });

    it('should reset singleton on failure so retry is possible', async () => {
      mockOpenDatabase.mockRejectedValueOnce(new Error('transient'));
      await expect(initializeDatabase()).rejects.toThrow();

      // Second call should attempt to open again
      mockOpenDatabase.mockResolvedValueOnce(mockDb);
      await expect(initializeDatabase()).resolves.toBeDefined();
      expect(mockOpenDatabase).toHaveBeenCalledTimes(2);
    });
  });

  // ── getDatabase ─────────────────────────────────────────────────────

  describe('getDatabase', () => {
    it('should throw if not initialized', () => {
      expect(() => getDatabase()).toThrow(DatabaseInitError);
      expect(() => getDatabase()).toThrow('Database not initialized');
    });

    it('should return the instance after initialization', async () => {
      await initializeDatabase();
      expect(getDatabase()).toBeDefined();
    });
  });

  // ── Migrations ──────────────────────────────────────────────────────

  describe('migrations', () => {
    it('should have at least one migration defined', () => {
      expect(migrations.length).toBeGreaterThanOrEqual(1);
    });

    it('should have migrations in ascending version order', () => {
      for (let i = 1; i < migrations.length; i++) {
        expect(migrations[i]!.version).toBeGreaterThan(migrations[i - 1]!.version);
      }
    });

    it('should start at version 1', () => {
      expect(migrations[0]!.version).toBe(1);
    });

    it('should run migration v1 on first init', async () => {
      await initializeDatabase();

      // Should have executed all v1 statements
      const v1 = migrations[0]!;
      for (const stmt of v1.statements) {
        expect(mockDb.execAsync).toHaveBeenCalledWith(stmt);
      }
    });

    it('should update schema version after migration', async () => {
      await initializeDatabase();
      const version = await getSchemaVersion();
      expect(version).toBe(migrations[migrations.length - 1]!.version);
    });

    it('should skip already-applied migrations', async () => {
      // Pre-set version to latest
      mockDb._setSchemaVersion(migrations[migrations.length - 1]!.version);

      await initializeDatabase();

      // withTransactionAsync should NOT have been called (no pending migrations)
      expect(mockDb.withTransactionAsync).not.toHaveBeenCalled();
    });

    it('should run migrations inside a transaction', async () => {
      await initializeDatabase();
      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
    });
  });

  // ── Schema Validation (v1 tables) ──────────────────────────────────

  describe('schema v1 tables', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    const expectedTables = [
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

    it.each(expectedTables)('should create the %s table', (tableName) => {
      const createCall = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('CREATE TABLE IF NOT EXISTS') && sql.includes(tableName),
      );
      expect(createCall).toBeDefined();
    });

    it('should create 9 data tables', () => {
      const createCalls = mockDb.execAsync.mock.calls.filter(([sql]: [string]) =>
        sql.match(/CREATE TABLE IF NOT EXISTS (?!_schema_version)/),
      );
      expect(createCalls.length).toBe(9);
    });

    // Verify key columns exist in CREATE TABLE SQL
    it('should include encrypted columns in profiles table', () => {
      const profileCreate = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('CREATE TABLE') && sql.includes('profiles'),
      );
      expect(profileCreate![0]).toContain('sa_id_number_encrypted');
    });

    it('should include encrypted columns in identity_documents table', () => {
      const idDocCreate = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('CREATE TABLE') && sql.includes('identity_documents'),
      );
      expect(idDocCreate![0]).toContain('encrypted_number');
      expect(idDocCreate![0]).toContain('additional_fields_encrypted');
    });

    it('should include encrypted columns in professional_registrations table', () => {
      const profRegCreate = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) =>
          sql.includes('CREATE TABLE') && sql.includes('professional_registrations'),
      );
      expect(profRegCreate![0]).toContain('registration_number_encrypted');
    });

    it('should set ON DELETE CASCADE for addresses', () => {
      const addressCreate = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('CREATE TABLE') && sql.includes('addresses'),
      );
      expect(addressCreate![0]).toContain('ON DELETE CASCADE');
    });

    it('should set ON DELETE CASCADE for document_pages', () => {
      const pageCreate = mockDb.execAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('CREATE TABLE') && sql.includes('document_pages'),
      );
      expect(pageCreate![0]).toContain('ON DELETE CASCADE');
    });

    it('should set ON DELETE CASCADE for signatures', () => {
      const sigCreate = mockDb.execAsync.mock.calls.find(([sql]: [string]) =>
        sql.includes('CREATE TABLE IF NOT EXISTS signatures'),
      );
      expect(sigCreate![0]).toContain('ON DELETE CASCADE');
    });

    it('should create indexes for foreign key columns', () => {
      const indexCalls = mockDb.execAsync.mock.calls.filter(([sql]: [string]) =>
        sql.includes('CREATE INDEX IF NOT EXISTS'),
      );
      // addresses, identity_documents, professional_registrations,
      // emergency_contacts, documents(status), document_pages,
      // detected_fields(document_id), detected_fields(page_id), signatures
      expect(indexCalls.length).toBeGreaterThanOrEqual(9);
    });
  });

  // ── Query Helpers ───────────────────────────────────────────────────

  describe('runQuery', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('should execute an INSERT statement', async () => {
      const result = await runQuery(
        'INSERT INTO profiles (id, first_name, last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        ['p1', 'John', 'Doe', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'],
      );
      expect(result).toHaveProperty('changes');
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should execute without params', async () => {
      const result = await runQuery('DELETE FROM profiles');
      expect(result).toHaveProperty('changes');
      expect(mockDb.runAsync).toHaveBeenCalled();
    });

    it('should throw QueryError on failure', async () => {
      mockDb.runAsync.mockRejectedValueOnce(new Error('constraint violation'));
      await expect(runQuery('INSERT INTO profiles (id) VALUES (?)', ['bad'])).rejects.toThrow(
        QueryError,
      );
    });
  });

  describe('getFirst', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('should return null when no rows match', async () => {
      mockDb.getFirstAsync.mockResolvedValueOnce(null);
      const result = await getFirst('SELECT * FROM profiles WHERE id = ?', ['nonexistent']);
      expect(result).toBeNull();
    });

    it('should return the first matching row', async () => {
      const mockRow = { id: 'p1', first_name: 'John' };
      mockDb.getFirstAsync.mockResolvedValueOnce(mockRow);
      const result = await getFirst('SELECT * FROM profiles WHERE id = ?', ['p1']);
      expect(result).toEqual(mockRow);
    });

    it('should throw QueryError on failure', async () => {
      mockDb.getFirstAsync.mockRejectedValueOnce(new Error('syntax error'));
      await expect(getFirst('SELECT * FROM bad_table')).rejects.toThrow(QueryError);
    });
  });

  describe('getAll', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('should return empty array when no rows match', async () => {
      mockDb.getAllAsync.mockResolvedValueOnce([]);
      const result = await getAll('SELECT * FROM profiles');
      expect(result).toEqual([]);
    });

    it('should return all matching rows', async () => {
      const mockRows = [
        { id: 'p1', first_name: 'John' },
        { id: 'p2', first_name: 'Jane' },
      ];
      mockDb.getAllAsync.mockResolvedValueOnce(mockRows);
      const result = await getAll('SELECT * FROM profiles');
      expect(result).toEqual(mockRows);
    });

    it('should throw QueryError on failure', async () => {
      mockDb.getAllAsync.mockRejectedValueOnce(new Error('disk error'));
      await expect(getAll('SELECT * FROM profiles')).rejects.toThrow(QueryError);
    });
  });

  // ── Transactions ────────────────────────────────────────────────────

  describe('withTransaction', () => {
    beforeEach(async () => {
      await initializeDatabase();
    });

    it('should execute callback within a transaction', async () => {
      const callback = vi.fn(async () => {});
      await withTransaction(callback);
      expect(mockDb.withTransactionAsync).toHaveBeenCalled();
      expect(callback).toHaveBeenCalled();
    });

    it('should throw TransactionError when callback fails', async () => {
      mockDb.withTransactionAsync.mockRejectedValueOnce(new Error('rollback'));
      await expect(
        withTransaction(async () => {
          throw new Error('test error');
        }),
      ).rejects.toThrow(TransactionError);
    });
  });

  // ── Close & Delete ──────────────────────────────────────────────────

  describe('closeDatabase', () => {
    it('should close the database connection', async () => {
      await initializeDatabase();
      await closeDatabase();
      expect(mockDb.closeAsync).toHaveBeenCalled();
    });

    it('should reset singleton after close', async () => {
      await initializeDatabase();
      await closeDatabase();
      expect(() => getDatabase()).toThrow(DatabaseInitError);
    });

    it('should be a no-op if not initialized', async () => {
      await closeDatabase(); // Should not throw
      expect(mockDb.closeAsync).not.toHaveBeenCalled();
    });
  });

  describe('deleteDatabase', () => {
    it('should close and delete the database', async () => {
      await initializeDatabase();
      await deleteDatabase();
      expect(mockDb.closeAsync).toHaveBeenCalled();
      expect(mockDeleteDatabase).toHaveBeenCalledWith('fillit.db');
    });

    it('should reset singleton after delete', async () => {
      await initializeDatabase();
      await deleteDatabase();
      expect(() => getDatabase()).toThrow(DatabaseInitError);
    });

    it('should still call deleteDatabaseAsync when not initialized', async () => {
      await deleteDatabase();
      expect(mockDb.closeAsync).not.toHaveBeenCalled();
      expect(mockDeleteDatabase).toHaveBeenCalledWith('fillit.db');
    });
  });
});

// ---------------------------------------------------------------------------
// Migration SQL content validation
// ---------------------------------------------------------------------------

describe('Migration v1 SQL Content', () => {
  const v1 = migrations[0]!;

  it('should have the correct version number', () => {
    expect(v1.version).toBe(1);
  });

  it('should create all required tables', () => {
    const allSql = v1.statements.join('\n');
    const requiredTables = [
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

    for (const table of requiredTables) {
      expect(allSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  describe('profiles table', () => {
    const profileSql = migrations[0]!.statements.find((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS profiles'),
    )!;

    const requiredColumns = [
      'id TEXT PRIMARY KEY',
      'is_primary INTEGER',
      'first_name TEXT NOT NULL',
      'last_name TEXT NOT NULL',
      'sa_id_number_encrypted TEXT',
      'email TEXT',
      'phone_mobile TEXT',
      'created_at TEXT NOT NULL',
      'updated_at TEXT NOT NULL',
    ];

    it.each(requiredColumns)('should include column: %s', (col) => {
      expect(profileSql).toContain(col);
    });
  });

  describe('addresses table', () => {
    const addressSql = migrations[0]!.statements.find((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS addresses'),
    )!;

    it('should reference profiles with ON DELETE CASCADE', () => {
      expect(addressSql).toContain('REFERENCES profiles(id) ON DELETE CASCADE');
    });

    it('should have province column for SA provinces', () => {
      expect(addressSql).toContain('province TEXT NOT NULL');
    });

    it('should default country to South Africa', () => {
      expect(addressSql).toContain("country TEXT DEFAULT 'South Africa'");
    });
  });

  describe('detected_fields table', () => {
    const fieldSql = migrations[0]!.statements.find((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS detected_fields'),
    )!;

    it('should reference both documents and document_pages with CASCADE', () => {
      expect(fieldSql).toContain('REFERENCES documents(id) ON DELETE CASCADE');
      expect(fieldSql).toContain('REFERENCES document_pages(id) ON DELETE CASCADE');
    });

    it('should have bounds_json for bounding box data', () => {
      expect(fieldSql).toContain('bounds_json TEXT NOT NULL');
    });

    it('should have match confidence as REAL', () => {
      expect(fieldSql).toContain('match_confidence REAL DEFAULT 0');
    });
  });

  describe('signatures table', () => {
    const sigSql = migrations[0]!.statements.find((s) =>
      s.includes('CREATE TABLE IF NOT EXISTS signatures'),
    )!;

    it('should support drawn and typed signature data', () => {
      expect(sigSql).toContain('type TEXT NOT NULL');
      expect(sigSql).toContain('image_uri TEXT');
      expect(sigSql).toContain('svg_path TEXT');
      expect(sigSql).toContain('text TEXT');
      expect(sigSql).toContain('font_family TEXT');
    });
  });
});
