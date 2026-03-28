/**
 * Authentication types for the token verification system.
 *
 * Defines the TokenVerifier interface that all providers (Google, Apple, Dev)
 * implement, and the AuthUser type stored on the request context.
 */

/** The identity provider that issued the token. */
export type AuthProvider = 'google' | 'apple' | 'dev';

/** Authenticated user extracted from a verified token. */
export interface AuthUser {
  /** Unique user ID from the identity provider. */
  id: string;
  /** Which provider verified the token. */
  provider: AuthProvider;
  /** User's email address (if available from the token). */
  email?: string;
}

/** Result of a successful token verification. */
export interface VerifyResult {
  user: AuthUser;
}

/**
 * Interface for OAuth token verifiers.
 *
 * Each provider (Google, Apple, Dev) implements this interface.
 * The auth middleware iterates through registered verifiers until
 * one accepts the token or all reject it.
 */
export interface TokenVerifier {
  /** Provider name for logging. */
  readonly provider: AuthProvider;

  /**
   * Attempt to verify a bearer token.
   *
   * @returns VerifyResult if the token is valid for this provider,
   *          or null if this provider doesn't recognize the token format.
   * @throws Only on unexpected errors (network failures, etc.).
   *         Return null for tokens that simply aren't for this provider.
   */
  verify(token: string): Promise<VerifyResult | null>;
}
