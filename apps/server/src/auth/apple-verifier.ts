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
    } catch {
      // Token is not a valid Apple token — let the next verifier try
      return null;
    }
  }
}
