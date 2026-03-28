/**
 * API client configuration.
 *
 * Reads the server URL from Expo environment variables.
 * Falls back to localhost for development.
 */

import Constants from 'expo-constants';

/** Base URL for the FillIt backend API. */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3000';

/** Default request timeout in milliseconds. */
export const API_TIMEOUT_MS = 30_000;

/** Maximum request timeout for analyze (image upload is slow). */
export const ANALYZE_TIMEOUT_MS = 120_000;
