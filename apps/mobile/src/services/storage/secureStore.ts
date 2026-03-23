/**
 * Secure Key Management Service
 *
 * Manages encryption keys using the platform's secure storage:
 * - iOS: Keychain Services
 * - Android: Android Keystore
 *
 * Features:
 * - AES-256-GCM key generation via expo-crypto
 * - Secure storage via expo-secure-store
 * - In-memory fallback with warning for devices without secure hardware
 * - Key rotation support
 * - Multiple named key support for different data domains
 */

import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  KeyDeletionError,
  KeyGenerationError,
  KeyRetrievalError,
  KeyStorageError,
  SecureHardwareUnavailableError,
} from './secureStoreErrors';

/** Length of AES-256 key in bytes. */
const KEY_BYTE_LENGTH = 32;

/** Default key alias used for the primary encryption key. */
const DEFAULT_KEY_ALIAS = 'fillit_encryption_key';

/** Keychain service identifier for namespacing keys. */
const KEYCHAIN_SERVICE = 'com.fillit.keymanagement';

/**
 * Whether the in-memory fallback is currently active.
 * When true, keys are stored in process memory instead of the OS keychain.
 */
let fallbackActive = false;

/**
 * In-memory key store used as a fallback when secure hardware is unavailable.
 * Keys stored here do not persist across app restarts.
 */
const inMemoryStore = new Map<string, string>();

/**
 * Listeners that are notified when the fallback mode changes.
 */
type FallbackListener = (isActive: boolean) => void;
const fallbackListeners: FallbackListener[] = [];

/**
 * Convert a Uint8Array to a base64 string.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Validate that a base64 string decodes to the expected byte length.
 */
function isValidKeyBase64(value: string, expectedBytes: number): boolean {
  try {
    const binary = atob(value);
    return binary.length === expectedBytes;
  } catch {
    return false;
  }
}

/**
 * Options for SecureStore set/get operations, configured for
 * maximum security while still allowing background access after
 * first device unlock.
 */
function getStoreOptions(): SecureStore.SecureStoreOptions {
  return {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  };
}

/**
 * Check whether the device supports secure hardware storage.
 *
 * @returns `true` if expo-secure-store is available on this device.
 */
export async function isSecureStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Register a listener to be notified when fallback mode changes.
 *
 * @param listener - Callback invoked with `true` when fallback activates,
 *   `false` when secure store becomes available.
 * @returns An unsubscribe function.
 */
export function onFallbackChange(listener: FallbackListener): () => void {
  fallbackListeners.push(listener);
  return () => {
    const index = fallbackListeners.indexOf(listener);
    if (index !== -1) {
      fallbackListeners.splice(index, 1);
    }
  };
}

/**
 * Whether the in-memory fallback is currently active.
 *
 * When `true`, keys are stored in volatile memory and will not
 * persist across app restarts. Callers should warn the user that
 * data may be lost.
 */
export function isFallbackActive(): boolean {
  return fallbackActive;
}

/**
 * Set the internal fallback state and notify listeners.
 */
function setFallbackActive(active: boolean): void {
  if (fallbackActive !== active) {
    fallbackActive = active;
    for (const listener of fallbackListeners) {
      listener(active);
    }
  }
}

/**
 * Initialize the key management service.
 *
 * Checks whether the device supports secure hardware storage and
 * activates the in-memory fallback if it does not. Should be called
 * once during app startup before any key operations.
 *
 * @throws {SecureHardwareUnavailableError} When secure hardware is not
 *   available (thrown once for logging; the service continues with fallback).
 */
export async function initialize(): Promise<void> {
  const available = await isSecureStoreAvailable();
  if (!available) {
    setFallbackActive(true);
    throw new SecureHardwareUnavailableError();
  }
  setFallbackActive(false);
}

/**
 * Generate a cryptographically secure 256-bit key.
 *
 * Uses expo-crypto's `getRandomBytes` which leverages the platform's
 * secure random number generator (SecRandomCopyBytes on iOS,
 * SecureRandom on Android).
 *
 * @returns The generated key as a base64-encoded string.
 * @throws {KeyGenerationError} If key generation fails.
 */
export function generateKey(): string {
  try {
    const keyBytes = getRandomBytes(KEY_BYTE_LENGTH);
    return uint8ArrayToBase64(keyBytes);
  } catch (error) {
    throw new KeyGenerationError('Failed to generate 256-bit encryption key', error);
  }
}

/**
 * Store a key in the secure store or in-memory fallback.
 *
 * @param alias - The key alias (identifier).
 * @param keyBase64 - The key value as a base64 string.
 * @throws {KeyStorageError} If the key cannot be stored.
 */
async function storeKey(alias: string, keyBase64: string): Promise<void> {
  if (fallbackActive) {
    inMemoryStore.set(alias, keyBase64);
    return;
  }

  try {
    await SecureStore.setItemAsync(alias, keyBase64, getStoreOptions());
  } catch (error) {
    throw new KeyStorageError(`Failed to store key with alias "${alias}"`, error);
  }
}

/**
 * Retrieve a key from the secure store or in-memory fallback.
 *
 * @param alias - The key alias (identifier).
 * @returns The key as a base64 string, or `null` if not found.
 * @throws {KeyRetrievalError} If the retrieval operation fails.
 */
async function retrieveKey(alias: string): Promise<string | null> {
  if (fallbackActive) {
    return inMemoryStore.get(alias) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(alias, getStoreOptions());
  } catch (error) {
    throw new KeyRetrievalError(`Failed to retrieve key with alias "${alias}"`, error);
  }
}

/**
 * Remove a key from the secure store or in-memory fallback.
 *
 * @param alias - The key alias (identifier).
 * @throws {KeyDeletionError} If the deletion operation fails.
 */
async function removeKey(alias: string): Promise<void> {
  if (fallbackActive) {
    inMemoryStore.delete(alias);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(alias, getStoreOptions());
  } catch (error) {
    throw new KeyDeletionError(`Failed to delete key with alias "${alias}"`, error);
  }
}

/**
 * Retrieve or create the primary encryption key.
 *
 * On first launch, generates a new 256-bit AES key and stores it
 * in the platform's secure store (iOS Keychain / Android Keystore).
 * On subsequent launches, returns the existing key.
 *
 * @param alias - Optional custom alias. Defaults to the primary key alias.
 * @returns The encryption key as a base64-encoded string.
 * @throws {KeyGenerationError} If key generation fails.
 * @throws {KeyStorageError} If the key cannot be stored.
 * @throws {KeyRetrievalError} If the key cannot be retrieved.
 */
export async function getOrCreateKey(alias: string = DEFAULT_KEY_ALIAS): Promise<string> {
  const existingKey = await retrieveKey(alias);
  if (existingKey) {
    if (!isValidKeyBase64(existingKey, KEY_BYTE_LENGTH)) {
      throw new KeyRetrievalError(`Key with alias "${alias}" is corrupt (invalid length)`);
    }
    return existingKey;
  }

  const newKey = generateKey();
  await storeKey(alias, newKey);
  return newKey;
}

/**
 * Retrieve an existing key without creating one.
 *
 * @param alias - Optional custom alias. Defaults to the primary key alias.
 * @returns The key as a base64 string, or `null` if no key exists.
 * @throws {KeyRetrievalError} If the retrieval operation fails.
 */
export async function getKey(alias: string = DEFAULT_KEY_ALIAS): Promise<string | null> {
  return retrieveKey(alias);
}

/**
 * Delete a key from the secure store.
 *
 * Use this when the user logs out, deletes their account, or when
 * performing key rotation.
 *
 * @param alias - Optional custom alias. Defaults to the primary key alias.
 * @throws {KeyDeletionError} If the deletion operation fails.
 */
export async function deleteKey(alias: string = DEFAULT_KEY_ALIAS): Promise<void> {
  await removeKey(alias);
}

/**
 * Rotate the encryption key.
 *
 * Generates a new key and replaces the existing one in the secure store.
 * The caller is responsible for re-encrypting any data that was encrypted
 * with the old key.
 *
 * @param alias - Optional custom alias. Defaults to the primary key alias.
 * @returns An object containing both the old key (for re-encryption)
 *   and the new key. `oldKey` is `null` if no previous key existed.
 * @throws {KeyGenerationError} If key generation fails.
 * @throws {KeyStorageError} If the new key cannot be stored.
 * @throws {KeyRetrievalError} If the old key cannot be retrieved.
 */
export async function rotateKey(
  alias: string = DEFAULT_KEY_ALIAS,
): Promise<{ oldKey: string | null; newKey: string }> {
  const oldKey = await retrieveKey(alias);
  const newKey = generateKey();
  await storeKey(alias, newKey);
  return { oldKey, newKey };
}

/**
 * Check whether a key exists in the secure store.
 *
 * @param alias - Optional custom alias. Defaults to the primary key alias.
 * @returns `true` if a key exists for the given alias.
 */
export async function hasKey(alias: string = DEFAULT_KEY_ALIAS): Promise<boolean> {
  const key = await retrieveKey(alias);
  return key !== null;
}

/**
 * Clear all keys from the in-memory fallback store.
 *
 * This only affects the in-memory fallback and has no effect on
 * keys stored in the OS keychain. Primarily useful for testing.
 */
export function clearInMemoryStore(): void {
  inMemoryStore.clear();
}

/**
 * Reset the service state.
 *
 * Clears the in-memory store and resets fallback status. This is
 * intended for testing; production code should use `deleteKey`
 * to remove individual keys.
 */
export function resetServiceState(): void {
  inMemoryStore.clear();
  setFallbackActive(false);
  fallbackListeners.length = 0;
}

export {
  SecureStoreError,
  KeyGenerationError,
  KeyStorageError,
  KeyRetrievalError,
  KeyDeletionError,
  SecureHardwareUnavailableError,
} from './secureStoreErrors';
