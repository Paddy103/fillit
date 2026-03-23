/**
 * Error types for the secure key management service.
 */

/**
 * Base error for all secure store operations.
 */
export class SecureStoreError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SecureStoreError';
    this.cause = cause;
  }
}

/**
 * Thrown when key generation fails (e.g., expo-crypto unavailable).
 */
export class KeyGenerationError extends SecureStoreError {
  constructor(message = 'Failed to generate encryption key', cause?: unknown) {
    super(message, cause);
    this.name = 'KeyGenerationError';
  }
}

/**
 * Thrown when a key cannot be stored in the secure store.
 */
export class KeyStorageError extends SecureStoreError {
  constructor(message = 'Failed to store encryption key', cause?: unknown) {
    super(message, cause);
    this.name = 'KeyStorageError';
  }
}

/**
 * Thrown when a key cannot be retrieved from the secure store.
 */
export class KeyRetrievalError extends SecureStoreError {
  constructor(message = 'Failed to retrieve encryption key', cause?: unknown) {
    super(message, cause);
    this.name = 'KeyRetrievalError';
  }
}

/**
 * Thrown when a key cannot be deleted from the secure store.
 */
export class KeyDeletionError extends SecureStoreError {
  constructor(message = 'Failed to delete encryption key', cause?: unknown) {
    super(message, cause);
    this.name = 'KeyDeletionError';
  }
}

/**
 * Thrown when the device does not support secure hardware storage
 * and the fallback is in use. This is a warning-level error that
 * can be caught and logged rather than blocking operation.
 */
export class SecureHardwareUnavailableError extends SecureStoreError {
  constructor(
    message = 'Secure hardware not available; using in-memory fallback',
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = 'SecureHardwareUnavailableError';
  }
}
