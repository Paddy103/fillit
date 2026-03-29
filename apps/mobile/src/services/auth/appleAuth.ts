/**
 * Apple Sign-In service for mobile.
 *
 * Wraps expo-apple-authentication to provide sign-in and sign-out.
 * The identity token is used to authenticate with the backend proxy.
 * Handles Apple's private relay email and first-sign-in name sharing.
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';

import { setAuthToken, clearAuthToken } from './tokenStore';

// ─── Types ─────────────────────────────────────────────────────────

export interface AppleAuthUser {
  /** Apple user ID (stable across sign-ins). */
  id: string;
  /** Email (may be private relay address like xyz@privaterelay.appleid.com). */
  email: string | null;
  /** Full name (only provided on FIRST sign-in — must be stored). */
  fullName: string | null;
  /** Identity token for backend verification. */
  identityToken: string;
  /** Authorization code (one-time use). */
  authorizationCode: string | null;
}

// ─── Errors ───────────────────────────────────────────────────────

export class AppleAuthError extends Error {
  public readonly code?: string;

  constructor(message: string, code?: string, cause?: unknown) {
    super(message);
    this.name = 'AppleAuthError';
    this.code = code;
    this.cause = cause;
  }
}

// ─── Service ──────────────────────────────────────────────────────

/**
 * Check if Apple Sign-In is available on this device.
 *
 * Apple Sign-In is only available on iOS 13+ and macOS.
 * Returns false on Android.
 */
export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

/**
 * Sign in with Apple.
 *
 * Opens the native Apple Sign-In UI and returns the authenticated user.
 * The identity token is stored securely for backend API calls.
 *
 * Note: Apple only provides the user's name on the FIRST sign-in.
 * The app must persist it — subsequent sign-ins return null for fullName.
 *
 * @returns The authenticated user with identity token.
 * @throws {AppleAuthError} On sign-in failure.
 */
export async function signInWithApple(): Promise<AppleAuthUser> {
  const available = await isAppleAuthAvailable();
  if (!available) {
    throw new AppleAuthError('Apple Sign-In is not available on this device', 'NOT_AVAILABLE');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new AppleAuthError('No identity token received from Apple');
    }

    // Store the token securely
    await setAuthToken(credential.identityToken);

    // Build full name from parts (only available on first sign-in)
    const fullName = buildFullName(credential.fullName);

    return {
      id: credential.user,
      email: credential.email,
      fullName,
      identityToken: credential.identityToken,
      authorizationCode: credential.authorizationCode,
    };
  } catch (error) {
    if (error instanceof AppleAuthError) throw error;

    // Handle Apple-specific error codes
    const code = (error as { code?: string }).code;
    if (code === 'ERR_REQUEST_CANCELED') {
      throw new AppleAuthError('Sign-in was cancelled', 'SIGN_IN_CANCELLED');
    }
    if (code === 'ERR_REQUEST_FAILED') {
      throw new AppleAuthError('Apple Sign-In request failed', 'REQUEST_FAILED', error);
    }
    if (code === 'ERR_REQUEST_NOT_HANDLED') {
      throw new AppleAuthError('Apple Sign-In not handled', 'NOT_HANDLED', error);
    }

    throw new AppleAuthError(
      error instanceof Error ? error.message : 'Apple Sign-In failed',
      code,
      error,
    );
  }
}

/**
 * Sign out (clear the stored Apple token).
 *
 * Apple doesn't have a server-side sign-out API —
 * we just clear the local token.
 */
export async function signOutApple(): Promise<void> {
  await clearAuthToken();
}

/**
 * Get the credential state for a previously signed-in user.
 *
 * Returns 'authorized' if the user is still signed in,
 * 'revoked' if they've revoked access, or null if unknown.
 */
export async function getAppleCredentialState(
  userId: string,
): Promise<'authorized' | 'revoked' | 'not_found' | null> {
  try {
    const state = await AppleAuthentication.getCredentialStateAsync(userId);
    switch (state) {
      case AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED:
        return 'authorized';
      case AppleAuthentication.AppleAuthenticationCredentialState.REVOKED:
        return 'revoked';
      case AppleAuthentication.AppleAuthenticationCredentialState.NOT_FOUND:
        return 'not_found';
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function buildFullName(
  name: AppleAuthentication.AppleAuthenticationFullName | null,
): string | null {
  if (!name) return null;
  const parts = [name.givenName, name.familyName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}
