/**
 * Google OAuth ID token verifier.
 *
 * Uses google-auth-library to verify tokens issued by Google Sign-In.
 * Extracts user ID and email from the token payload.
 */

import { OAuth2Client } from 'google-auth-library';
import type { TokenVerifier, VerifyResult } from './types.js';

export class GoogleTokenVerifier implements TokenVerifier {
  readonly provider = 'google' as const;
  private client: OAuth2Client;
  private clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
    this.client = new OAuth2Client(clientId);
  }

  async verify(token: string): Promise<VerifyResult | null> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();
      if (!payload?.sub) return null;

      return {
        user: {
          id: payload.sub,
          provider: 'google',
          email: payload.email,
        },
      };
    } catch {
      // Token is not a valid Google token — let the next verifier try
      return null;
    }
  }
}
