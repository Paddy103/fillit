import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  getRandomBytes: vi.fn((count: number) => {
    const bytes = new Uint8Array(count);
    // Use Node crypto for genuinely random bytes in tests
    bytes.set(randomBytes(count));
    return bytes;
  }),
}));

// Mock expo-file-system (imported transitively via storage barrel)
vi.mock('expo-file-system', () => ({
  Paths: { document: { uri: 'file:///mock/' } },
  File: vi.fn(),
  Directory: vi.fn(),
}));

// Mock expo-sqlite (imported transitively via storage barrel)
vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
  deleteDatabaseAsync: vi.fn(),
}));

// Mock expo-secure-store
const mockStore: Record<string, string> = {};
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(mockStore[key] ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    mockStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    delete mockStore[key];
    return Promise.resolve();
  }),
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
  AFTER_FIRST_UNLOCK: 1,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
  WHEN_UNLOCKED: 3,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 5,
  ALWAYS: 6,
  ALWAYS_THIS_DEVICE_ONLY: 7,
}));

import {
  getOrCreateEncryptionKey,
  encrypt,
  decrypt,
  deleteEncryptionKey,
  isEncryptedFormat,
} from '../utils/encryption';
import { DecryptionError, InvalidFormatError, KeyNotFoundError } from '../utils/encryption-errors';

beforeEach(() => {
  // Clear the mock store between tests
  for (const key of Object.keys(mockStore)) {
    delete mockStore[key];
  }
});

describe('getOrCreateEncryptionKey', () => {
  it('should generate and store a new key when none exists', async () => {
    const key = await getOrCreateEncryptionKey();
    expect(key).toBeTruthy();
    expect(typeof key).toBe('string');
    // Key should be base64-encoded 32 bytes
    const binary = atob(key);
    expect(binary.length).toBe(32);
  });

  it('should return the same key on subsequent calls', async () => {
    const key1 = await getOrCreateEncryptionKey();
    const key2 = await getOrCreateEncryptionKey();
    expect(key1).toBe(key2);
  });
});

describe('encrypt / decrypt roundtrip', () => {
  it('should encrypt and decrypt plaintext correctly', async () => {
    const plaintext = 'Hello, FillIt!';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same plaintext (random IV)', async () => {
    const plaintext = 'Same message twice';
    const encrypted1 = await encrypt(plaintext);
    const encrypted2 = await encrypt(plaintext);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should handle empty string encryption/decryption', async () => {
    const plaintext = '';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle unicode strings', async () => {
    const plaintext =
      'Hallo wereld! \u{1F1FF}\u{1F1E6} Suid-Afrika \u2764\uFE0F \u00E9\u00E8\u00EA\u00EB \u4F60\u597D';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle large strings', async () => {
    const plaintext = 'A'.repeat(100_000);
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce output in the expected format', async () => {
    const encrypted = await encrypt('test');
    expect(isEncryptedFormat(encrypted)).toBe(true);
    const parts = encrypted.split(':');
    expect(parts.length).toBe(2);
  });
});

describe('isEncryptedFormat', () => {
  it('should return true for valid encrypted format', () => {
    expect(isEncryptedFormat('AAAAAAAAAAAAAAAA:BBBBBBBBB=')).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(isEncryptedFormat('')).toBe(false);
  });

  it('should return false for string without colon', () => {
    expect(isEncryptedFormat('nocolonhere')).toBe(false);
  });

  it('should return false for string with colon but invalid base64', () => {
    expect(isEncryptedFormat('not valid!:also not valid!')).toBe(false);
  });

  it('should return false for colon-only string', () => {
    expect(isEncryptedFormat(':')).toBe(false);
  });

  it('should return false for string with empty first part', () => {
    expect(isEncryptedFormat(':BBBBB=')).toBe(false);
  });

  it('should return false for string with empty second part', () => {
    expect(isEncryptedFormat('AAAAA=:')).toBe(false);
  });
});

describe('decrypt error handling', () => {
  it('should throw InvalidFormatError for invalid format', async () => {
    await expect(decrypt('not-encrypted')).rejects.toThrow(InvalidFormatError);
  });

  it('should throw KeyNotFoundError when key is missing', async () => {
    // First encrypt to get a valid format, then delete the key
    const encrypted = await encrypt('test');
    await deleteEncryptionKey();
    await expect(decrypt(encrypted)).rejects.toThrow(KeyNotFoundError);
  });

  it('should throw DecryptionError for tampered ciphertext', async () => {
    const encrypted = await encrypt('test');
    const [iv, ciphertext] = encrypted.split(':');
    // Tamper with the ciphertext
    const tampered = `${iv}:${ciphertext!.slice(0, -4)}AAAA`;
    await expect(decrypt(tampered)).rejects.toThrow(DecryptionError);
  });
});

describe('deleteEncryptionKey', () => {
  it('should remove the key from the store', async () => {
    await getOrCreateEncryptionKey();
    await deleteEncryptionKey();
    // Encrypting again should create a new key
    const encrypted = await encrypt('after delete');
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe('after delete');
  });
});
