/**
 * Tests for Google Sign-In service.
 *
 * Mocks @react-native-google-signin/google-signin and expo-secure-store
 * to verify sign-in flow, token storage, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockConfigure = vi.fn();
const mockSignIn = vi.fn();
const mockSignInSilently = vi.fn();
const mockSignOut = vi.fn();
const mockHasPlayServices = vi.fn();
const mockHasPreviousSignIn = vi.fn();

vi.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => mockConfigure(...args),
    signIn: () => mockSignIn(),
    signInSilently: () => mockSignInSilently(),
    signOut: () => mockSignOut(),
    hasPlayServices: (...args: unknown[]) => mockHasPlayServices(...args),
    hasPreviousSignIn: () => mockHasPreviousSignIn(),
  },
  isSuccessResponse: (r: { type: string }) => r.type === 'success',
  isErrorWithCode: (e: unknown) => e instanceof Error && 'code' in e,
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
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

// ─── Tests ────────────────────────────────────────────────────────

describe('googleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configureGoogleAuth', () => {
    it('should configure the Google Sign-In SDK', () => {
      configureGoogleAuth({ webClientId: 'test-client-id' });

      expect(mockConfigure).toHaveBeenCalledWith({
        webClientId: 'test-client-id',
        iosClientId: undefined,
        offlineAccess: false,
      });
    });

    it('should pass optional config', () => {
      configureGoogleAuth({
        webClientId: 'test-client-id',
        iosClientId: 'ios-client-id',
        offlineAccess: true,
      });

      expect(mockConfigure).toHaveBeenCalledWith({
        webClientId: 'test-client-id',
        iosClientId: 'ios-client-id',
        offlineAccess: true,
      });
    });
  });

  describe('signInWithGoogle', () => {
    beforeEach(() => {
      configureGoogleAuth({ webClientId: 'test-id' });
    });

    it('should sign in and return user with token', async () => {
      mockHasPlayServices.mockResolvedValue(true);
      mockSignIn.mockResolvedValue({
        type: 'success',
        data: {
          idToken: 'mock-id-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            photo: 'https://photo.url',
          },
        },
      });

      const user = await signInWithGoogle();

      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
      expect(user.idToken).toBe('mock-id-token');
      expect(mockSetItem).toHaveBeenCalledWith('com.fillit.auth.token', 'mock-id-token');
    });

    it('should throw on cancelled sign-in', async () => {
      mockHasPlayServices.mockResolvedValue(true);
      mockSignIn.mockResolvedValue({ type: 'cancelled' });

      await expect(signInWithGoogle()).rejects.toThrow('Sign-in was cancelled');
    });

    it('should throw when no ID token received', async () => {
      mockHasPlayServices.mockResolvedValue(true);
      mockSignIn.mockResolvedValue({
        type: 'success',
        data: {
          idToken: null,
          user: { id: '1', email: 'a@b.com', name: null, photo: null },
        },
      });

      await expect(signInWithGoogle()).rejects.toThrow('No ID token');
    });
  });

  describe('silentSignIn', () => {
    beforeEach(() => {
      configureGoogleAuth({ webClientId: 'test-id' });
    });

    it('should return user on successful silent sign-in', async () => {
      mockSignInSilently.mockResolvedValue({
        type: 'success',
        data: {
          idToken: 'refreshed-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            photo: null,
          },
        },
      });

      const user = await silentSignIn();

      expect(user).not.toBeNull();
      expect(user!.idToken).toBe('refreshed-token');
      expect(mockSetItem).toHaveBeenCalledWith('com.fillit.auth.token', 'refreshed-token');
    });

    it('should return null on failed silent sign-in', async () => {
      mockSignInSilently.mockRejectedValue(new Error('Not signed in'));

      const user = await silentSignIn();

      expect(user).toBeNull();
    });
  });

  describe('signOutGoogle', () => {
    beforeEach(() => {
      configureGoogleAuth({ webClientId: 'test-id' });
    });

    it('should sign out and clear token', async () => {
      await signOutGoogle();

      expect(mockSignOut).toHaveBeenCalledOnce();
      expect(mockDeleteItem).toHaveBeenCalledWith('com.fillit.auth.token');
    });

    it('should clear token even if sign-out throws', async () => {
      mockSignOut.mockRejectedValue(new Error('Network error'));

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
    beforeEach(() => {
      configureGoogleAuth({ webClientId: 'test-id' });
    });

    it('should return true when previously signed in', () => {
      mockHasPreviousSignIn.mockReturnValue(true);

      expect(isSignedIn()).toBe(true);
    });

    it('should return false when not signed in', () => {
      mockHasPreviousSignIn.mockReturnValue(false);

      expect(isSignedIn()).toBe(false);
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
