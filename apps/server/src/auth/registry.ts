/**
 * Token verifier registry.
 *
 * Builds the chain of active verifiers based on environment configuration.
 * In production, only Google and Apple verifiers are registered (when their
 * credentials are present). In development, the dev verifier is also added.
 */

import type { TokenVerifier } from './types.js';
import { GoogleTokenVerifier } from './google-verifier.js';
import { AppleTokenVerifier } from './apple-verifier.js';
import { DevTokenVerifier } from './dev-verifier.js';

/**
 * Create the list of active token verifiers from environment variables.
 *
 * Verifiers are registered when their credentials are available.
 * The dev verifier is included when AUTH_DEV_TOKENS is not explicitly "false".
 * In production (NODE_ENV=production), dev tokens are disabled by default.
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

  // Dev tokens — enabled by default in non-production, disabled in production
  const devTokensSetting = process.env.AUTH_DEV_TOKENS;
  const devTokensEnabled = devTokensSetting ? devTokensSetting === 'true' : !isProduction;

  if (devTokensEnabled) {
    verifiers.push(new DevTokenVerifier());
  }

  return verifiers;
}
