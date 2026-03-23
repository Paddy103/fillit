import { describe, it, expect, vi, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available inside vi.mock factories
// ---------------------------------------------------------------------------

const {
  mockGetRandomBytes,
  mockSecureStore,
  mockIsAvailableAsync,
  mockSetItemAsync,
  mockGetItemAsync,
  mockDeleteItemAsync,
} = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    mockGetRandomBytes: vi.fn((count: number) => {
      const bytes = new Uint8Array(count);
      bytes.set(randomBytes(count));
      return bytes;
    }),
    mockSecureStore: store,
    mockIsAvailableAsync: vi.fn(() => Promise.resolve(true)),
    mockSetItemAsync: vi.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    mockGetItemAsync: vi.fn((key: string) => Promise.resolve(store[key] ?? null)),
    mockDeleteItemAsync: vi.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
  };
});

vi.mock('expo-crypto', () => ({
  getRandomBytes: mockGetRandomBytes,
}));

vi.mock('expo-secure-store', () => ({
  isAvailableAsync: mockIsAvailableAsync,
  setItemAsync: mockSetItemAsync,
  getItemAsync: mockGetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
  AFTER_FIRST_UNLOCK: 1,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
  WHEN_UNLOCKED: 3,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 4,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 5,
  ALWAYS: 6,
  ALWAYS_THIS_DEVICE_ONLY: 7,
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import {
  initialize,
  isSecureStoreAvailable,
  isFallbackActive,
  onFallbackChange,
  generateKey,
  getOrCreateKey,
  getKey,
  deleteKey,
  rotateKey,
  hasKey,
  clearInMemoryStore,
  resetServiceState,
  SecureStoreError,
  KeyGenerationError,
  KeyStorageError,
  KeyRetrievalError,
  KeyDeletionError,
  SecureHardwareUnavailableError,
} from '../services/storage/secureStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clear the mock secure store object (simulating empty keychain). */
function clearMockSecureStore(): void {
  for (const key of Object.keys(mockSecureStore)) {
    delete mockSecureStore[key];
  }
}

/** Decode a base64 string and return the byte length. */
function base64ByteLength(b64: string): number {
  return atob(b64).length;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  clearMockSecureStore();
  resetServiceState();
});

// ===========================================================================
// isSecureStoreAvailable
// ===========================================================================

describe('isSecureStoreAvailable', () => {
  it('should return true when expo-secure-store is available', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    const result = await isSecureStoreAvailable();
    expect(result).toBe(true);
  });

  it('should return false when expo-secure-store is not available', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    const result = await isSecureStoreAvailable();
    expect(result).toBe(false);
  });

  it('should return false when isAvailableAsync throws', async () => {
    mockIsAvailableAsync.mockRejectedValueOnce(new Error('Device error'));
    const result = await isSecureStoreAvailable();
    expect(result).toBe(false);
  });
});

// ===========================================================================
// initialize
// ===========================================================================

describe('initialize', () => {
  it('should succeed without throwing when secure hardware is available', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    await expect(initialize()).resolves.toBeUndefined();
    expect(isFallbackActive()).toBe(false);
  });

  it('should throw SecureHardwareUnavailableError when hardware is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    await expect(initialize()).rejects.toThrow(SecureHardwareUnavailableError);
  });

  it('should activate fallback mode when hardware is unavailable', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }
    expect(isFallbackActive()).toBe(true);
  });

  it('should deactivate fallback if previously active and hardware becomes available', async () => {
    // First: unavailable
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }
    expect(isFallbackActive()).toBe(true);

    // Second: available
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    await initialize();
    expect(isFallbackActive()).toBe(false);
  });

  it('should notify fallback listeners when fallback activates', async () => {
    const listener = vi.fn();
    onFallbackChange(listener);

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener).toHaveBeenCalledWith(true);
  });
});

// ===========================================================================
// generateKey
// ===========================================================================

describe('generateKey', () => {
  it('should return a base64-encoded string', () => {
    const key = generateKey();
    expect(typeof key).toBe('string');
    // Should not throw on decode
    expect(() => atob(key)).not.toThrow();
  });

  it('should generate a 256-bit (32-byte) key', () => {
    const key = generateKey();
    expect(base64ByteLength(key)).toBe(32);
  });

  it('should call expo-crypto getRandomBytes with 32', () => {
    generateKey();
    expect(mockGetRandomBytes).toHaveBeenCalledWith(32);
  });

  it('should produce different keys on successive calls', () => {
    const key1 = generateKey();
    const key2 = generateKey();
    expect(key1).not.toBe(key2);
  });

  it('should throw KeyGenerationError when getRandomBytes fails', () => {
    mockGetRandomBytes.mockImplementationOnce(() => {
      throw new Error('RNG failure');
    });
    expect(() => generateKey()).toThrow(KeyGenerationError);
  });

  it('should preserve the original error as cause in KeyGenerationError', () => {
    const originalError = new Error('RNG failure');
    mockGetRandomBytes.mockImplementationOnce(() => {
      throw originalError;
    });
    try {
      generateKey();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(KeyGenerationError);
      expect((error as KeyGenerationError).cause).toBe(originalError);
    }
  });
});

// ===========================================================================
// getOrCreateKey
// ===========================================================================

describe('getOrCreateKey', () => {
  it('should generate and store a new key when none exists', async () => {
    const key = await getOrCreateKey();
    expect(key).toBeTruthy();
    expect(base64ByteLength(key)).toBe(32);
    // Verify it was stored in the mock secure store
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
  });

  it('should return the same key on subsequent calls (retrieves from store)', async () => {
    const key1 = await getOrCreateKey();
    const key2 = await getOrCreateKey();
    expect(key1).toBe(key2);
    // Should only have stored once (second call retrieved)
    expect(mockSetItemAsync).toHaveBeenCalledTimes(1);
  });

  it('should use the default alias when none is provided', async () => {
    await getOrCreateKey();
    expect(mockGetItemAsync).toHaveBeenCalledWith(
      'fillit_encryption_key',
      expect.objectContaining({ keychainService: 'com.fillit.keymanagement' }),
    );
  });

  it('should support custom key aliases', async () => {
    const key1 = await getOrCreateKey('key_a');
    const key2 = await getOrCreateKey('key_b');
    expect(key1).not.toBe(key2);
    expect(mockSetItemAsync).toHaveBeenCalledTimes(2);
  });

  it('should throw KeyRetrievalError for a corrupt stored key (wrong length)', async () => {
    // Pre-seed the store with a corrupt key (too short)
    const shortKey = btoa('tooshort');
    mockSecureStore['fillit_encryption_key'] = shortKey;

    await expect(getOrCreateKey()).rejects.toThrow(KeyRetrievalError);
  });

  it('should throw KeyRetrievalError for an invalid base64 stored key', async () => {
    // Pre-seed with invalid base64
    mockSecureStore['fillit_encryption_key'] = '!!!not-base64!!!';

    await expect(getOrCreateKey()).rejects.toThrow(KeyRetrievalError);
  });

  it('should throw KeyStorageError when secure store setItemAsync fails', async () => {
    mockSetItemAsync.mockRejectedValueOnce(new Error('Keychain full'));
    await expect(getOrCreateKey()).rejects.toThrow(KeyStorageError);
  });

  it('should throw KeyRetrievalError when secure store getItemAsync fails', async () => {
    mockGetItemAsync.mockRejectedValueOnce(new Error('Access denied'));
    await expect(getOrCreateKey()).rejects.toThrow(KeyRetrievalError);
  });

  it('should pass keychainService option to secure store', async () => {
    await getOrCreateKey();
    expect(mockGetItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ keychainService: 'com.fillit.keymanagement' }),
    );
  });
});

// ===========================================================================
// getKey
// ===========================================================================

describe('getKey', () => {
  it('should return null when no key exists', async () => {
    const result = await getKey();
    expect(result).toBeNull();
  });

  it('should return the stored key when one exists', async () => {
    const created = await getOrCreateKey();
    const retrieved = await getKey();
    expect(retrieved).toBe(created);
  });

  it('should use the default alias when none is provided', async () => {
    await getKey();
    expect(mockGetItemAsync).toHaveBeenCalledWith('fillit_encryption_key', expect.any(Object));
  });

  it('should support custom aliases', async () => {
    await getOrCreateKey('custom_alias');
    const result = await getKey('custom_alias');
    expect(result).toBeTruthy();
    expect(base64ByteLength(result!)).toBe(32);
  });

  it('should return null for an alias that was never stored', async () => {
    await getOrCreateKey('alias_a');
    const result = await getKey('alias_b');
    expect(result).toBeNull();
  });

  it('should throw KeyRetrievalError when getItemAsync fails', async () => {
    mockGetItemAsync.mockRejectedValueOnce(new Error('Permission denied'));
    await expect(getKey()).rejects.toThrow(KeyRetrievalError);
  });
});

// ===========================================================================
// deleteKey
// ===========================================================================

describe('deleteKey', () => {
  it('should delete an existing key from the secure store', async () => {
    await getOrCreateKey();
    await deleteKey();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('fillit_encryption_key', expect.any(Object));
    const result = await getKey();
    expect(result).toBeNull();
  });

  it('should not throw when deleting a non-existent key', async () => {
    await expect(deleteKey()).resolves.toBeUndefined();
  });

  it('should support custom aliases', async () => {
    await getOrCreateKey('to_delete');
    await deleteKey('to_delete');
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('to_delete', expect.any(Object));
  });

  it('should throw KeyDeletionError when deleteItemAsync fails', async () => {
    mockDeleteItemAsync.mockRejectedValueOnce(new Error('Cannot delete'));
    await expect(deleteKey()).rejects.toThrow(KeyDeletionError);
  });

  it('should preserve the original error as cause in KeyDeletionError', async () => {
    const originalError = new Error('Cannot delete');
    mockDeleteItemAsync.mockRejectedValueOnce(originalError);
    try {
      await deleteKey();
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(KeyDeletionError);
      expect((error as KeyDeletionError).cause).toBe(originalError);
    }
  });
});

// ===========================================================================
// rotateKey
// ===========================================================================

describe('rotateKey', () => {
  it('should return old key as null when no previous key exists', async () => {
    const result = await rotateKey();
    expect(result.oldKey).toBeNull();
    expect(result.newKey).toBeTruthy();
    expect(base64ByteLength(result.newKey)).toBe(32);
  });

  it('should return the old key and a different new key', async () => {
    const original = await getOrCreateKey();
    const result = await rotateKey();
    expect(result.oldKey).toBe(original);
    expect(result.newKey).not.toBe(original);
    expect(base64ByteLength(result.newKey)).toBe(32);
  });

  it('should store the new key (replacing the old one)', async () => {
    await getOrCreateKey();
    const result = await rotateKey();
    const stored = await getKey();
    expect(stored).toBe(result.newKey);
  });

  it('should support custom aliases', async () => {
    await getOrCreateKey('rotate_test');
    const result = await rotateKey('rotate_test');
    expect(result.oldKey).toBeTruthy();
    expect(result.newKey).not.toBe(result.oldKey);
  });

  it('should throw KeyStorageError when storing the new key fails', async () => {
    await getOrCreateKey();
    mockSetItemAsync.mockRejectedValueOnce(new Error('Store full'));
    await expect(rotateKey()).rejects.toThrow(KeyStorageError);
  });

  it('should throw KeyRetrievalError when retrieving the old key fails', async () => {
    await getOrCreateKey();
    mockGetItemAsync.mockRejectedValueOnce(new Error('Read error'));
    await expect(rotateKey()).rejects.toThrow(KeyRetrievalError);
  });

  it('should throw KeyGenerationError when key generation fails during rotation', async () => {
    await getOrCreateKey();
    mockGetRandomBytes.mockImplementationOnce(() => {
      throw new Error('RNG broken');
    });
    await expect(rotateKey()).rejects.toThrow(KeyGenerationError);
  });
});

// ===========================================================================
// hasKey
// ===========================================================================

describe('hasKey', () => {
  it('should return false when no key exists', async () => {
    const result = await hasKey();
    expect(result).toBe(false);
  });

  it('should return true after a key is created', async () => {
    await getOrCreateKey();
    const result = await hasKey();
    expect(result).toBe(true);
  });

  it('should return false after a key is deleted', async () => {
    await getOrCreateKey();
    await deleteKey();
    const result = await hasKey();
    expect(result).toBe(false);
  });

  it('should support custom aliases', async () => {
    await getOrCreateKey('has_key_test');
    expect(await hasKey('has_key_test')).toBe(true);
    expect(await hasKey('other_alias')).toBe(false);
  });
});

// ===========================================================================
// Fallback mode (in-memory store)
// ===========================================================================

describe('fallback mode', () => {
  beforeEach(async () => {
    // Activate fallback mode by simulating unavailable hardware
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected SecureHardwareUnavailableError
    }
    expect(isFallbackActive()).toBe(true);
  });

  it('should store and retrieve keys in-memory when fallback is active', async () => {
    const key = await getOrCreateKey();
    expect(key).toBeTruthy();
    expect(base64ByteLength(key)).toBe(32);

    // Should NOT have called the real secure store
    expect(mockSetItemAsync).not.toHaveBeenCalled();
    expect(mockGetItemAsync).not.toHaveBeenCalled();
  });

  it('should return the same key on subsequent calls in fallback mode', async () => {
    const key1 = await getOrCreateKey();
    const key2 = await getOrCreateKey();
    expect(key1).toBe(key2);
  });

  it('should delete keys from in-memory store', async () => {
    await getOrCreateKey('fb_delete');
    expect(await hasKey('fb_delete')).toBe(true);
    await deleteKey('fb_delete');
    expect(await hasKey('fb_delete')).toBe(false);
    expect(mockDeleteItemAsync).not.toHaveBeenCalled();
  });

  it('should rotate keys in in-memory store', async () => {
    const original = await getOrCreateKey();
    const result = await rotateKey();
    expect(result.oldKey).toBe(original);
    expect(result.newKey).not.toBe(original);
    expect(await getKey()).toBe(result.newKey);
  });

  it('should support multiple aliases in fallback mode', async () => {
    const key1 = await getOrCreateKey('alias_1');
    const key2 = await getOrCreateKey('alias_2');
    expect(key1).not.toBe(key2);
    expect(await getKey('alias_1')).toBe(key1);
    expect(await getKey('alias_2')).toBe(key2);
  });

  it('should return null for non-existent key in fallback mode', async () => {
    const result = await getKey('nonexistent');
    expect(result).toBeNull();
  });

  it('should clear all in-memory keys with clearInMemoryStore', async () => {
    await getOrCreateKey('a');
    await getOrCreateKey('b');
    clearInMemoryStore();
    expect(await getKey('a')).toBeNull();
    expect(await getKey('b')).toBeNull();
  });
});

// ===========================================================================
// Fallback listener (onFallbackChange)
// ===========================================================================

describe('onFallbackChange', () => {
  it('should notify listener when fallback is activated', async () => {
    const listener = vi.fn();
    onFallbackChange(listener);

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('should notify listener when fallback is deactivated', async () => {
    const listener = vi.fn();

    // First activate fallback
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    // Then subscribe and deactivate
    onFallbackChange(listener);
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    await initialize();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('should support multiple listeners', async () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    onFallbackChange(listener1);
    onFallbackChange(listener2);

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener1).toHaveBeenCalledWith(true);
    expect(listener2).toHaveBeenCalledWith(true);
  });

  it('should not notify after unsubscribing', async () => {
    const listener = vi.fn();
    const unsubscribe = onFallbackChange(listener);
    unsubscribe();

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not notify when fallback state does not change', async () => {
    const listener = vi.fn();
    onFallbackChange(listener);

    // Initialize with available hardware (fallback stays false)
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    await initialize();

    expect(listener).not.toHaveBeenCalled();
  });

  it('should return a valid unsubscribe function', () => {
    const listener = vi.fn();
    const unsubscribe = onFallbackChange(listener);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should handle double unsubscribe gracefully', async () => {
    const listener = vi.fn();
    const unsubscribe = onFallbackChange(listener);
    unsubscribe();
    unsubscribe(); // second call should not throw

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// isFallbackActive
// ===========================================================================

describe('isFallbackActive', () => {
  it('should return false by default (after reset)', () => {
    expect(isFallbackActive()).toBe(false);
  });

  it('should return true after initialize with unavailable hardware', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }
    expect(isFallbackActive()).toBe(true);
  });

  it('should return false after initialize with available hardware', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(true);
    await initialize();
    expect(isFallbackActive()).toBe(false);
  });
});

// ===========================================================================
// clearInMemoryStore
// ===========================================================================

describe('clearInMemoryStore', () => {
  it('should not affect keys in the secure store', async () => {
    // Create a key in the real (mocked) secure store
    const key = await getOrCreateKey();
    clearInMemoryStore();
    // Key should still be in the secure store
    const retrieved = await getKey();
    expect(retrieved).toBe(key);
  });

  it('should clear keys in fallback mode', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    await getOrCreateKey();
    expect(await hasKey()).toBe(true);

    clearInMemoryStore();
    expect(await hasKey()).toBe(false);
  });

  it('should not throw when called on an empty store', () => {
    expect(() => clearInMemoryStore()).not.toThrow();
  });
});

// ===========================================================================
// resetServiceState
// ===========================================================================

describe('resetServiceState', () => {
  it('should clear in-memory store', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    await getOrCreateKey();
    resetServiceState();
    // Fallback is now false, so getKey will use secure store (which is empty)
    expect(await getKey()).toBeNull();
  });

  it('should reset fallback state to false', async () => {
    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }
    expect(isFallbackActive()).toBe(true);

    resetServiceState();
    expect(isFallbackActive()).toBe(false);
  });

  it('should remove all fallback listeners', async () => {
    const listener = vi.fn();
    onFallbackChange(listener);
    resetServiceState();

    mockIsAvailableAsync.mockResolvedValueOnce(false);
    try {
      await initialize();
    } catch {
      // expected
    }

    expect(listener).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Error hierarchy
// ===========================================================================

describe('error hierarchy', () => {
  it('KeyGenerationError should extend SecureStoreError', () => {
    const error = new KeyGenerationError('test');
    expect(error).toBeInstanceOf(SecureStoreError);
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('KeyGenerationError');
  });

  it('KeyStorageError should extend SecureStoreError', () => {
    const error = new KeyStorageError('test');
    expect(error).toBeInstanceOf(SecureStoreError);
    expect(error.name).toBe('KeyStorageError');
  });

  it('KeyRetrievalError should extend SecureStoreError', () => {
    const error = new KeyRetrievalError('test');
    expect(error).toBeInstanceOf(SecureStoreError);
    expect(error.name).toBe('KeyRetrievalError');
  });

  it('KeyDeletionError should extend SecureStoreError', () => {
    const error = new KeyDeletionError('test');
    expect(error).toBeInstanceOf(SecureStoreError);
    expect(error.name).toBe('KeyDeletionError');
  });

  it('SecureHardwareUnavailableError should extend SecureStoreError', () => {
    const error = new SecureHardwareUnavailableError();
    expect(error).toBeInstanceOf(SecureStoreError);
    expect(error.name).toBe('SecureHardwareUnavailableError');
  });

  it('SecureStoreError should extend Error', () => {
    const error = new SecureStoreError('test');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('SecureStoreError');
  });

  it('errors should preserve cause', () => {
    const cause = new Error('root');
    const error = new KeyStorageError('wrapper', cause);
    expect(error.cause).toBe(cause);
  });

  it('errors should have default messages', () => {
    expect(new KeyGenerationError().message).toBe('Failed to generate encryption key');
    expect(new KeyStorageError().message).toBe('Failed to store encryption key');
    expect(new KeyRetrievalError().message).toBe('Failed to retrieve encryption key');
    expect(new KeyDeletionError().message).toBe('Failed to delete encryption key');
    expect(new SecureHardwareUnavailableError().message).toBe(
      'Secure hardware not available; using in-memory fallback',
    );
  });
});

// ===========================================================================
// SecureStore options (keychainService)
// ===========================================================================

describe('secure store options', () => {
  it('should pass keychainService option on store operations', async () => {
    await getOrCreateKey();
    expect(mockGetItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        keychainService: 'com.fillit.keymanagement',
        keychainAccessible: 1, // AFTER_FIRST_UNLOCK
      }),
    );
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.objectContaining({
        keychainService: 'com.fillit.keymanagement',
        keychainAccessible: 1,
      }),
    );
  });

  it('should pass keychainService option on delete operations', async () => {
    await getOrCreateKey();
    await deleteKey();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        keychainService: 'com.fillit.keymanagement',
      }),
    );
  });
});

// ===========================================================================
// Edge cases
// ===========================================================================

describe('edge cases', () => {
  it('should handle empty string alias by treating it as a valid key name', async () => {
    // Empty string is a valid JS object key; it should work without error
    const key = await getOrCreateKey('');
    expect(key).toBeTruthy();
    expect(base64ByteLength(key)).toBe(32);
  });

  it('should handle alias with special characters', async () => {
    const alias = 'key-with.special_chars/123';
    const key = await getOrCreateKey(alias);
    expect(key).toBeTruthy();
    const retrieved = await getKey(alias);
    expect(retrieved).toBe(key);
  });

  it('should handle rapid successive getOrCreateKey calls', async () => {
    // Simulate multiple concurrent calls — all should resolve to valid keys
    const promises = Array.from({ length: 10 }, () => getOrCreateKey());
    const results = await Promise.all(promises);
    // All should return the same key (first write wins, rest retrieve)
    const uniqueKeys = new Set(results);
    // Due to race conditions in async, we might get 1 or more unique keys,
    // but all should be valid 32-byte base64 strings
    for (const key of uniqueKeys) {
      expect(base64ByteLength(key)).toBe(32);
    }
  });

  it('should isolate keys across different aliases', async () => {
    const keyA = await getOrCreateKey('domain_a');
    const keyB = await getOrCreateKey('domain_b');
    expect(keyA).not.toBe(keyB);

    await deleteKey('domain_a');
    expect(await hasKey('domain_a')).toBe(false);
    expect(await hasKey('domain_b')).toBe(true);
  });

  it('should handle getOrCreateKey after deleteKey (re-creation)', async () => {
    const key1 = await getOrCreateKey();
    await deleteKey();
    const key2 = await getOrCreateKey();
    // Should have created a brand new key
    expect(key2).not.toBe(key1);
    expect(base64ByteLength(key2)).toBe(32);
  });

  it('should handle rotateKey on a non-existent key', async () => {
    const result = await rotateKey('never_existed');
    expect(result.oldKey).toBeNull();
    expect(result.newKey).toBeTruthy();
    expect(base64ByteLength(result.newKey)).toBe(32);
    // The new key should be stored
    expect(await getKey('never_existed')).toBe(result.newKey);
  });

  it('should handle hasKey when retrieval throws', async () => {
    mockGetItemAsync.mockRejectedValueOnce(new Error('Transient'));
    await expect(hasKey()).rejects.toThrow(KeyRetrievalError);
  });
});

// ===========================================================================
// Key integrity validation
// ===========================================================================

describe('key integrity validation', () => {
  it('should reject a stored key that is too short', async () => {
    // 16 bytes instead of 32
    const shortKey = btoa(String.fromCharCode(...new Uint8Array(16).fill(65)));
    mockSecureStore['fillit_encryption_key'] = shortKey;

    await expect(getOrCreateKey()).rejects.toThrow(KeyRetrievalError);
    await expect(getOrCreateKey()).rejects.toThrow(/corrupt/i);
  });

  it('should reject a stored key that is too long', async () => {
    // 64 bytes instead of 32
    const longKey = btoa(String.fromCharCode(...new Uint8Array(64).fill(65)));
    mockSecureStore['fillit_encryption_key'] = longKey;

    await expect(getOrCreateKey()).rejects.toThrow(KeyRetrievalError);
  });

  it('should accept a valid 32-byte base64 key', async () => {
    const validKey = btoa(String.fromCharCode(...new Uint8Array(32).fill(66)));
    mockSecureStore['fillit_encryption_key'] = validKey;

    const result = await getOrCreateKey();
    expect(result).toBe(validKey);
  });
});
