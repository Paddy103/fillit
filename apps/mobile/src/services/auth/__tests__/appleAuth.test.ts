/**
 * Tests for Apple Sign-In service.
 *
 * Mocks expo-apple-authentication and expo-secure-store
 * to verify sign-in flow, token storage, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockIsAvailableAsync = vi.fn();
const mockSignInAsync = vi.fn();
const mockGetCredentialStateAsync = vi.fn();

vi.mock('expo-apple-authentication', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  signInAsync: (...args: unknown[]) => mockSignInAsync(...args),
  getCredentialStateAsync: (...args: unknown[]) => mockGetCredentialStateAsync(...args),
  AppleAuthenticationScope: {
    FULL_NAME: 0,
    EMAIL: 1,
  },
  AppleAuthenticationCredentialState: {
    AUTHORIZED: 1,
    REVOKED: 0,
    NOT_FOUND: 2,
  },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mockSetItem = vi.fn();
const mockDeleteItem = vi.fn();

vi.mock('expo-secure-store', () => ({
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
  getItemAsync: vi.fn(),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItem(...args),
}));

import {
  isAppleAuthAvailable,
  signInWithApple,
  signOutApple,
  getAppleCredentialState,
  AppleAuthError,
} from '../appleAuth';

// ─── Tests ────────────────────────────────────────────────────────

describe('appleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAppleAuthAvailable', () => {
    it('should return true on iOS when available', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);

      const result = await isAppleAuthAvailable();

      expect(result).toBe(true);
    });

    it('should return false when not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      const result = await isAppleAuthAvailable();

      expect(result).toBe(false);
    });
  });

  describe('signInWithApple', () => {
    it('should sign in and return user with token', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockSignInAsync.mockResolvedValue({
        user: 'apple-user-123',
        email: 'test@icloud.com',
        fullName: { givenName: 'John', familyName: 'Doe' },
        identityToken: 'apple-id-token',
        authorizationCode: 'auth-code-123',
      });

      const user = await signInWithApple();

      expect(user.id).toBe('apple-user-123');
      expect(user.email).toBe('test@icloud.com');
      expect(user.fullName).toBe('John Doe');
      expect(user.identityToken).toBe('apple-id-token');
      expect(user.authorizationCode).toBe('auth-code-123');
      expect(mockSetItem).toHaveBeenCalledWith('com.fillit.auth.token', 'apple-id-token');
    });

    it('should handle private relay email', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockSignInAsync.mockResolvedValue({
        user: 'apple-user-456',
        email: 'xyz@privaterelay.appleid.com',
        fullName: null,
        identityToken: 'token-456',
        authorizationCode: null,
      });

      const user = await signInWithApple();

      expect(user.email).toBe('xyz@privaterelay.appleid.com');
      expect(user.fullName).toBeNull();
    });

    it('should throw when not available', async () => {
      mockIsAvailableAsync.mockResolvedValue(false);

      await expect(signInWithApple()).rejects.toThrow('not available');
    });

    it('should throw on cancelled sign-in', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      const error = new Error('cancelled');
      (error as { code?: string }).code = 'ERR_REQUEST_CANCELED';
      mockSignInAsync.mockRejectedValue(error);

      await expect(signInWithApple()).rejects.toThrow('cancelled');
    });

    it('should throw when no identity token received', async () => {
      mockIsAvailableAsync.mockResolvedValue(true);
      mockSignInAsync.mockResolvedValue({
        user: 'user-1',
        email: null,
        fullName: null,
        identityToken: null,
        authorizationCode: null,
      });

      await expect(signInWithApple()).rejects.toThrow('No identity token');
    });
  });

  describe('signOutApple', () => {
    it('should clear the stored token', async () => {
      await signOutApple();

      expect(mockDeleteItem).toHaveBeenCalledWith('com.fillit.auth.token');
    });
  });

  describe('getAppleCredentialState', () => {
    it('should return authorized', async () => {
      mockGetCredentialStateAsync.mockResolvedValue(1); // AUTHORIZED

      const state = await getAppleCredentialState('user-123');

      expect(state).toBe('authorized');
    });

    it('should return revoked', async () => {
      mockGetCredentialStateAsync.mockResolvedValue(0); // REVOKED

      const state = await getAppleCredentialState('user-123');

      expect(state).toBe('revoked');
    });

    it('should return not_found', async () => {
      mockGetCredentialStateAsync.mockResolvedValue(2); // NOT_FOUND

      const state = await getAppleCredentialState('user-123');

      expect(state).toBe('not_found');
    });

    it('should return null on error', async () => {
      mockGetCredentialStateAsync.mockRejectedValue(new Error('Network'));

      const state = await getAppleCredentialState('user-123');

      expect(state).toBeNull();
    });
  });

  describe('AppleAuthError', () => {
    it('should have correct name and code', () => {
      const error = new AppleAuthError('test', 'TEST_CODE');

      expect(error.name).toBe('AppleAuthError');
      expect(error.message).toBe('test');
      expect(error.code).toBe('TEST_CODE');
    });
  });
});
