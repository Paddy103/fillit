/**
 * Apple Sign-In token verifier.
 *
 * Uses apple-signin-auth to verify identity tokens issued by
 * Apple Sign-In. Extracts user ID and email from the token payload.
 */

import appleSignin from 'apple-signin-auth';
import type { TokenVerifier, VerifyResult } from './types.js';

export interface AppleVerifierConfig {
  clientId: string;
}

export class AppleTokenVerifier implements TokenVerifier {
  readonly provider = 'apple' as const;
  private clientId: string;

  constructor(config: AppleVerifierConfig) {
    this.clientId = config.clientId;
  }

  async verify(token: string): Promise<VerifyResult | null> {
    try {
      const payload = await appleSignin.verifyIdToken(token, {
        audience: this.clientId,
      });

      if (!payload.sub) return null;

      return {
        user: {
          id: payload.sub,
          provider: 'apple',
          email: payload.email,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isValidationError =
        message.includes('invalid') || message.includes('expired') || message.includes('audience');

      if (!isValidationError) {
        console.warn('[auth:apple] Verification error (possible infra issue):', message);
      }
      return null;
    }
  }
}
