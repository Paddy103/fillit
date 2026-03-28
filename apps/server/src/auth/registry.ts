/**
 * Token verifier registry.
 *
 * Builds the chain of active verifiers based on environment configuration.
 * In production, only Google and Apple verifiers are registered (when their
 * credentials are present). Dev tokens are NEVER available in production.
 */

import type { TokenVerifier } from './types.js';
import { GoogleTokenVerifier } from './google-verifier.js';
import { AppleTokenVerifier } from './apple-verifier.js';
import { DevTokenVerifier } from './dev-verifier.js';

/**
 * Create the list of active token verifiers from environment variables.
 *
 * Verifiers are registered when their credentials are available.
 * Dev tokens are enabled by default in non-production and hard-blocked
 * in production regardless of env vars.
 */
export function createVerifiers(): TokenVerifier[] {
  const verifiers: TokenVerifier[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Google
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (googleClientId) {
    verifiers.push(new GoogleTokenVerifier(googleClientId));
  }

  // Apple
  const appleClientId = process.env.APPLE_CLIENT_ID;
  if (appleClientId) {
    verifiers.push(new AppleTokenVerifier({ clientId: appleClientId }));
  }

  // Dev tokens — hard-blocked in production, enabled by default in dev
  if (!isProduction) {
    const devTokensSetting = process.env.AUTH_DEV_TOKENS;
    const devTokensEnabled = devTokensSetting ? devTokensSetting === 'true' : true;

    if (devTokensEnabled) {
      verifiers.push(new DevTokenVerifier());
      console.log('[auth] Dev token verifier enabled (non-production)');
    }
  }

  // Warn if no verifiers are registered
  if (verifiers.length === 0) {
    console.warn(
      '[auth] WARNING: No token verifiers registered. All authenticated requests will be rejected.',
    );
  }

  return verifiers;
}
