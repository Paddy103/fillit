/**
 * Error types for the encryption module.
 */

export class EncryptionError extends Error {
  public cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'EncryptionError';
    this.cause = cause;
  }
}

export class KeyNotFoundError extends EncryptionError {
  constructor(message = 'Encryption key not found in secure store', cause?: unknown) {
    super(message, cause);
    this.name = 'KeyNotFoundError';
  }
}

export class DecryptionError extends EncryptionError {
  constructor(message = 'Failed to decrypt data', cause?: unknown) {
    super(message, cause);
    this.name = 'DecryptionError';
  }
}

export class InvalidFormatError extends EncryptionError {
  constructor(message = 'Invalid encrypted data format', cause?: unknown) {
    super(message, cause);
    this.name = 'InvalidFormatError';
  }
}
