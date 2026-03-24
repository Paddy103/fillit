/**
 * Error types for file storage operations.
 */

export class FileStorageError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'FileStorageError';
    this.cause = cause;
  }
}

export class FileWriteError extends FileStorageError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'FileWriteError';
  }
}

export class FileReadError extends FileStorageError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'FileReadError';
  }
}

export class FileDeleteError extends FileStorageError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'FileDeleteError';
  }
}

export class DirectoryError extends FileStorageError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'DirectoryError';
  }
}
