/**
 * Tests for Google Sign-In service.
 *
 * Mocks expo-auth-session, expo-web-browser, and expo-secure-store
 * to verify sign-in flow, token storage, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockPromptAsync = vi.fn();

vi.mock('expo-auth-session', () => {
  return {
    AuthRequest: class MockAuthRequest {
      constructor() {}
      promptAsync = mockPromptAsync;
    },
    ResponseType: { IdToken: 'id_token' },
    makeRedirectUri: vi.fn(() => 'https://auth.expo.io/@test/fillit'),
    useAutoDiscovery: undefined,
  };
});

vi.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: vi.fn(),
}));

const mockSetItem = vi.fn();
const mockGetItem = vi.fn();
const mockDeleteItem = vi.fn();

vi.mock('expo-secure-store', () => ({
  setItemAsync: (...args: unknown[]) => mockSetItem(...args),
  getItemAsync: (...args: unknown[]) => mockGetItem(...args),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItem(...args),
}));

import {
  configureGoogleAuth,
  signInWithGoogle,
  silentSignIn,
  signOutGoogle,
  getCurrentToken,
  isSignedIn,
  GoogleAuthError,
} from '../googleAuth';

// ─── Helpers ─────────────────────────────────────────────────────

/** Create a fake JWT with given payload claims. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = 'fake-signature';
  return `${header}.${body}.${sig}`;
}

const validToken = fakeJwt({
  sub: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://photo.url',
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
});

const expiredToken = fakeJwt({
  sub: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: null,
  exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
});

// ─── Tests ────────────────────────────────────────────────────────

describe('googleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configureGoogleAuth', () => {
    it('should store config without throwing', () => {
      expect(() => configureGoogleAuth({ webClientId: 'test-client-id' })).not.toThrow();
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      configureGoogleAuth({ webClientId: 'test-id' });
    });

    it('should sign in and return user with token', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: { id_token: validToken },
      });

      const user = await signInWithGoogle();

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.idToken).toBe(validToken);
      expect(mockSetItem).toHaveBeenCalledWith('com.fillit.auth.token', validToken);
    });

    it('should throw on cancelled sign-in (dismiss)', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'dismiss' });

      await expect(signInWithGoogle()).rejects.toThrow('Sign-in was cancelled');
    });

    it('should throw on cancelled sign-in (cancel)', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'cancel' });

      await expect(signInWithGoogle()).rejects.toThrow('Sign-in was cancelled');
    });

    it('should throw when no ID token in response', async () => {
      mockPromptAsync.mockResolvedValue({
        type: 'success',
        params: {},
      });

      await expect(signInWithGoogle()).rejects.toThrow('No ID token');
    });

    it('should throw GoogleAuthError on auth failure', async () => {
      mockPromptAsync.mockResolvedValue({ type: 'error' });

      await expect(signInWithGoogle()).rejects.toThrow(GoogleAuthError);
    });
  });

  describe('silentSignIn', () => {
    it('should return user from stored valid token', async () => {
      mockGetItem.mockResolvedValue(validToken);

      const user = await silentSignIn();

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-123');
      expect(user!.email).toBe('test@example.com');
      expect(user!.idToken).toBe(validToken);
    });

    it('should return null when no stored token', async () => {
      mockGetItem.mockResolvedValue(null);

      const user = await silentSignIn();

      expect(user).toBeNull();
    });

    it('should return null and clear expired token', async () => {
      mockGetItem.mockResolvedValue(expiredToken);

      const user = await silentSignIn();

      expect(user).toBeNull();
      expect(mockDeleteItem).toHaveBeenCalledWith('com.fillit.auth.token');
    });

    it('should return null on decode error', async () => {
      mockGetItem.mockResolvedValue('not-a-jwt');

      const user = await silentSignIn();

      expect(user).toBeNull();
    });
  });

  describe('signOutGoogle', () => {
    it('should clear the stored token', async () => {
      await signOutGoogle();

      expect(mockDeleteItem).toHaveBeenCalledWith('com.fillit.auth.token');
    });
  });

  describe('getCurrentToken', () => {
    it('should return stored token', async () => {
      mockGetItem.mockResolvedValue('stored-token');

      const token = await getCurrentToken();

      expect(token).toBe('stored-token');
    });

    it('should return null when no token stored', async () => {
      mockGetItem.mockResolvedValue(null);

      const token = await getCurrentToken();

      expect(token).toBeNull();
    });
  });

  describe('isSignedIn', () => {
    it('should return true with valid stored token', async () => {
      mockGetItem.mockResolvedValue(validToken);

      expect(await isSignedIn()).toBe(true);
    });

    it('should return false with no stored token', async () => {
      mockGetItem.mockResolvedValue(null);

      expect(await isSignedIn()).toBe(false);
    });

    it('should return false with expired token', async () => {
      mockGetItem.mockResolvedValue(expiredToken);

      expect(await isSignedIn()).toBe(false);
    });
  });

  describe('GoogleAuthError', () => {
    it('should have correct name and code', () => {
      const error = new GoogleAuthError('test', 'TEST_CODE');

      expect(error.name).toBe('GoogleAuthError');
      expect(error.message).toBe('test');
      expect(error.code).toBe('TEST_CODE');
    });
  });
});
