/**
 * AES-256-GCM encryption module for securing sensitive data at rest.
 *
 * Storage format: base64(iv):base64(ciphertext+tag)
 * - IV: 12 bytes, randomly generated per encryption
 * - Key: 256-bit, managed by the secure key management service
 * - GCM tag: 128-bit, appended to ciphertext by WebCrypto
 *
 * Key management is delegated to `services/storage/secureStore`, which
 * handles secure hardware detection, fallback, and key lifecycle.
 */

import { getRandomBytes } from 'expo-crypto';

import { getOrCreateKey, getKey, deleteKey } from '../services/storage';
import {
  DecryptionError,
  EncryptionError,
  InvalidFormatError,
  KeyNotFoundError,
} from './encryption-errors';

const IV_BYTE_LENGTH = 12;

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
 * Convert a base64 string to a Uint8Array.
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import a raw key as a CryptoKey for AES-256-GCM.
 */
async function importKey(rawKeyBytes: Uint8Array): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    'raw',
    rawKeyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Retrieve or create the encryption key.
 *
 * Delegates to the secure key management service which handles
 * secure hardware storage, key generation, and fallback.
 *
 * @returns The encryption key as a base64 string.
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  try {
    return await getOrCreateKey();
  } catch (error) {
    throw new EncryptionError('Failed to get or create encryption key', error);
  }
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @param plaintext - The string to encrypt.
 * @returns The encrypted data in the format `base64(iv):base64(ciphertext+tag)`.
 */
export async function encrypt(plaintext: string): Promise<string> {
  try {
    const keyBase64 = await getOrCreateEncryptionKey();
    const keyBytes = base64ToUint8Array(keyBase64);
    const cryptoKey = await importKey(keyBytes);

    const iv = getRandomBytes(IV_BYTE_LENGTH);
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      plaintextBytes.buffer as ArrayBuffer,
    );

    const ciphertextBytes = new Uint8Array(ciphertextBuffer);
    const ivBase64 = uint8ArrayToBase64(iv);
    const ciphertextBase64 = uint8ArrayToBase64(ciphertextBytes);

    return `${ivBase64}:${ciphertextBase64}`;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Failed to encrypt data', error);
  }
}

/**
 * Decrypt AES-256-GCM encrypted data.
 *
 * @param encryptedData - The encrypted string in `base64(iv):base64(ciphertext+tag)` format.
 * @returns The decrypted plaintext string.
 */
export async function decrypt(encryptedData: string): Promise<string> {
  if (!isEncryptedFormat(encryptedData)) {
    throw new InvalidFormatError(
      `Invalid encrypted data format: expected base64(iv):base64(ciphertext+tag)`,
    );
  }

  try {
    const colonIndex = encryptedData.indexOf(':');
    const ivBase64 = encryptedData.slice(0, colonIndex);
    const ciphertextBase64 = encryptedData.slice(colonIndex + 1);

    const iv = base64ToUint8Array(ivBase64);
    const ciphertextBytes = base64ToUint8Array(ciphertextBase64);

    const keyBase64 = await getKey();
    if (!keyBase64) {
      throw new KeyNotFoundError();
    }

    const keyBytes = base64ToUint8Array(keyBase64);
    const cryptoKey = await importKey(keyBytes);

    const plaintextBuffer = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      cryptoKey,
      ciphertextBytes.buffer as ArrayBuffer,
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintextBuffer);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new DecryptionError('Failed to decrypt data', error);
  }
}

/**
 * Delete the encryption key from the platform secure store.
 *
 * Use this when the user logs out or deletes their account.
 */
export async function deleteEncryptionKey(): Promise<void> {
  try {
    await deleteKey();
  } catch (error) {
    throw new EncryptionError('Failed to delete encryption key', error);
  }
}

/**
 * Check whether a string matches the encrypted data format.
 *
 * The expected format is two base64-encoded segments separated by a colon:
 * `base64(iv):base64(ciphertext+tag)`
 *
 * @param value - The string to check.
 * @returns `true` if the string matches the encrypted format.
 */
export function isEncryptedFormat(value: string): boolean {
  if (!value || !value.includes(':')) {
    return false;
  }

  const colonIndex = value.indexOf(':');
  const part1 = value.slice(0, colonIndex);
  const part2 = value.slice(colonIndex + 1);

  if (!part1 || !part2) {
    return false;
  }

  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  return base64Regex.test(part1) && base64Regex.test(part2);
}
