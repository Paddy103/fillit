/**
 * Auth token store using expo-secure-store.
 *
 * Securely stores and retrieves the authentication token
 * (Google/Apple ID token) using the platform's secure storage.
 */

import * as SecureStore from 'expo-secure-store';

const AUTH_TOKEN_KEY = 'com.fillit.auth.token';

/**
 * Store an auth token securely.
 */
export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

/**
 * Retrieve the stored auth token.
 *
 * @returns The token, or null if not stored.
 */
export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

/**
 * Clear the stored auth token.
 */
export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
