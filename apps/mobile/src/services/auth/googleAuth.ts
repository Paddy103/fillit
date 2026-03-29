/**
 * Google Sign-In service for mobile.
 *
 * Wraps @react-native-google-signin/google-signin to provide
 * sign-in, sign-out, token retrieval, and silent refresh.
 * The ID token is used to authenticate with the backend proxy.
 */

import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { getAuthToken, setAuthToken, clearAuthToken } from './tokenStore';

// ─── Types ─────────────────────────────────────────────────────────

export interface GoogleAuthUser {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  idToken: string;
}

export interface GoogleAuthConfig {
  /** Google OAuth Web Client ID (used for backend verification). */
  webClientId: string;
  /** iOS Client ID (optional, for iOS-specific config). */
  iosClientId?: string;
  /** Request offline access for refresh tokens. @default false */
  offlineAccess?: boolean;
}

// ─── Errors ───────────────────────────────────────────────────────

export class GoogleAuthError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'GoogleAuthError';
    this.code = code;
    this.cause = cause;
  }
}

// ─── Service ──────────────────────────────────────────────────────

let isConfigured = false;

/**
 * Configure the Google Sign-In SDK.
 * Must be called once during app startup before any sign-in attempts.
 */
export function configureGoogleAuth(config: GoogleAuthConfig): void {
  GoogleSignin.configure({
    webClientId: config.webClientId,
    iosClientId: config.iosClientId,
    offlineAccess: config.offlineAccess ?? false,
  });
  isConfigured = true;
}

/**
 * Sign in with Google.
 *
 * Opens the Google Sign-In UI and returns the authenticated user
 * with an ID token. The token is stored securely for later use.
 *
 * @returns The authenticated user with ID token.
 * @throws {GoogleAuthError} On sign-in failure.
 */
export async function signInWithGoogle(): Promise<GoogleAuthUser> {
  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      throw new GoogleAuthError('Sign-in was cancelled', 'SIGN_IN_CANCELLED');
    }

    const { data } = response;
    const idToken = data.idToken;

    if (!idToken) {
      throw new GoogleAuthError('No ID token received from Google');
    }

    // Store the token securely
    await setAuthToken(idToken);

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      photo: data.user.photo,
      idToken,
    };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;

    if (isErrorWithCode(error)) {
      switch (error.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          throw new GoogleAuthError('Sign-in was cancelled', 'SIGN_IN_CANCELLED');
        case statusCodes.IN_PROGRESS:
          throw new GoogleAuthError('Sign-in already in progress', 'IN_PROGRESS');
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new GoogleAuthError(
            'Google Play Services is not available',
            'PLAY_SERVICES_UNAVAILABLE',
          );
        default:
          throw new GoogleAuthError(`Google Sign-In failed: ${error.message}`, error.code, error);
      }
    }

    throw new GoogleAuthError(
      error instanceof Error ? error.message : 'Google Sign-In failed',
      undefined,
      error,
    );
  }
}

/**
 * Attempt a silent sign-in (token refresh).
 *
 * Returns the current user if still signed in, or null if
 * the user needs to sign in again interactively.
 */
export async function silentSignIn(): Promise<GoogleAuthUser | null> {
  ensureConfigured();

  try {
    const response = await GoogleSignin.signInSilently();

    if (response.type !== 'success') {
      return null;
    }

    const { data } = response;
    const idToken = data.idToken;

    if (!idToken) return null;

    await setAuthToken(idToken);

    return {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      photo: data.user.photo,
      idToken,
    };
  } catch {
    // Silent sign-in failed — user needs to sign in interactively
    return null;
  }
}

/**
 * Sign out from Google.
 *
 * Revokes the current session and clears the stored token.
 */
export async function signOutGoogle(): Promise<void> {
  ensureConfigured();

  try {
    await GoogleSignin.signOut();
  } catch {
    // Ignore sign-out errors — clear local state regardless
  }

  await clearAuthToken();
}

/**
 * Get the current auth token.
 *
 * Returns the stored ID token, or null if not signed in.
 */
export async function getCurrentToken(): Promise<string | null> {
  return getAuthToken();
}

/**
 * Check if the user is currently signed in.
 */
export function isSignedIn(): boolean {
  ensureConfigured();
  return GoogleSignin.hasPreviousSignIn();
}

// ─── Helpers ──────────────────────────────────────────────────────

function ensureConfigured(): void {
  if (!isConfigured) {
    throw new GoogleAuthError(
      'Google Sign-In not configured. Call configureGoogleAuth() first.',
      'NOT_CONFIGURED',
    );
  }
}
