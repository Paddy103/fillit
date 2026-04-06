/**
 * Google Sign-In service for mobile.
 *
 * Uses expo-auth-session with Google's OAuth discovery document
 * to provide sign-in, sign-out, and token retrieval via a web-based
 * auth flow. No native GoogleSignIn pod required.
 *
 * The ID token is used to authenticate with the backend proxy.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { getAuthToken, setAuthToken, clearAuthToken } from './tokenStore';

// Ensure the web browser auth session completes cleanly on iOS
WebBrowser.maybeCompleteAuthSession();

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

// ─── Constants ───────────────────────────────────────────────────

const GOOGLE_DISCOVERY = AuthSession.useAutoDiscovery
  ? undefined
  : {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

// ─── Service ──────────────────────────────────────────────────────

let storedConfig: GoogleAuthConfig | null = null;

/**
 * Configure the Google auth service.
 * Must be called once during app startup before any sign-in attempts.
 */
export function configureGoogleAuth(config: GoogleAuthConfig): void {
  storedConfig = config;
}

/**
 * Sign in with Google.
 *
 * Opens a web-based Google OAuth flow and returns the authenticated user
 * with an ID token. The token is stored securely for later use.
 *
 * @returns The authenticated user with ID token.
 * @throws {GoogleAuthError} On sign-in failure.
 */
export async function signInWithGoogle(): Promise<GoogleAuthUser> {
  const config = ensureConfigured();

  try {
    const redirectUri = AuthSession.makeRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: config.webClientId,
      scopes: ['openid', 'profile', 'email'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: {
        nonce: Math.random().toString(36).substring(2),
      },
    });

    const discovery = GOOGLE_DISCOVERY ?? {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    const result = await request.promptAsync(discovery);

    if (result.type === 'dismiss' || result.type === 'cancel') {
      throw new GoogleAuthError('Sign-in was cancelled', 'SIGN_IN_CANCELLED');
    }

    if (result.type !== 'success') {
      throw new GoogleAuthError(`Google Sign-In failed: ${result.type}`, 'AUTH_FAILED');
    }

    const idToken = result.params?.id_token ?? result.authentication?.idToken ?? null;

    if (!idToken) {
      throw new GoogleAuthError('No ID token received from Google');
    }

    // Decode basic user info from the ID token JWT
    const user = decodeIdToken(idToken);

    // Store the token securely
    await setAuthToken(idToken);

    return {
      id: user.sub,
      email: user.email,
      name: user.name ?? null,
      photo: user.picture ?? null,
      idToken,
    };
  } catch (error) {
    if (error instanceof GoogleAuthError) throw error;

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
 * With expo-auth-session there's no true silent refresh — we check
 * the stored token and return the cached user if it's still valid.
 * Returns null if no stored session exists.
 */
export async function silentSignIn(): Promise<GoogleAuthUser | null> {
  try {
    const idToken = await getAuthToken();
    if (!idToken) return null;

    const user = decodeIdToken(idToken);

    // Check if the token is expired
    if (user.exp && user.exp * 1000 < Date.now()) {
      await clearAuthToken();
      return null;
    }

    return {
      id: user.sub,
      email: user.email,
      name: user.name ?? null,
      photo: user.picture ?? null,
      idToken,
    };
  } catch {
    // Token decode failed — user needs to sign in interactively
    return null;
  }
}

/**
 * Sign out from Google.
 *
 * Clears the stored token. No native SDK state to clear.
 */
export async function signOutGoogle(): Promise<void> {
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
 *
 * Checks for a stored, non-expired token.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    const user = decodeIdToken(token);
    if (user.exp && user.exp * 1000 < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function ensureConfigured(): GoogleAuthConfig {
  if (!storedConfig) {
    throw new GoogleAuthError(
      'Google Sign-In not configured. Call configureGoogleAuth() first.',
      'NOT_CONFIGURED',
    );
  }
  return storedConfig;
}

interface DecodedIdToken {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  exp?: number;
}

/**
 * Decode the payload of a JWT ID token (no verification — the server does that).
 */
function decodeIdToken(token: string): DecodedIdToken {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new GoogleAuthError('Invalid ID token format');
  }

  // Base64url decode
  const payload = parts[1]!;
  const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(padded);
  const parsed = JSON.parse(decoded) as DecodedIdToken;

  if (!parsed.sub || !parsed.email) {
    throw new GoogleAuthError('ID token missing required claims');
  }

  return parsed;
}
