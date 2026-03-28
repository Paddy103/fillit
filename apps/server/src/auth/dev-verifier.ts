/**
 * Development-only token verifier.
 *
 * Accepts tokens in the format "dev:<userId>" and extracts the user ID.
 * Only registered when AUTH_DEV_TOKENS is enabled (defaults to true
 * in development, false in production).
 *
 * Usage:
 *   Authorization: Bearer dev:user-123
 *
 * This verifier exercises the same middleware pipeline as real providers,
 * ensuring downstream code always receives a properly-set userId context.
 */

import type { TokenVerifier, VerifyResult } from './types.js';

const DEV_TOKEN_PREFIX = 'dev:';

export class DevTokenVerifier implements TokenVerifier {
  readonly provider = 'dev' as const;

  async verify(token: string): Promise<VerifyResult | null> {
    if (!token.startsWith(DEV_TOKEN_PREFIX)) return null;

    const userId = token.slice(DEV_TOKEN_PREFIX.length).trim();
    if (!userId) return null;

    return {
      user: {
        id: userId,
        provider: 'dev',
        email: `${userId}@dev.fillit.local`,
      },
    };
  }
}
