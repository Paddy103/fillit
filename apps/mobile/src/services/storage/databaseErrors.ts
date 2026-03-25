/**
 * Error types for SQLite database operations.
 */

export class DatabaseError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.cause = cause;
  }
}

export class DatabaseInitError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DatabaseInitError';
  }
}

export class MigrationError extends DatabaseError {
  public readonly version: number;

  constructor(version: number, message: string, cause?: unknown) {
    super(`Migration v${version} failed: ${message}`, cause);
    this.name = 'MigrationError';
    this.version = version;
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'QueryError';
  }
}

export class TransactionError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'TransactionError';
  }
}
