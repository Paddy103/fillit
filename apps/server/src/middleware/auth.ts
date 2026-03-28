/**
 * Authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, iterates
 * through registered token verifiers, and sets the authenticated user
 * on the request context. Returns 401 if no verifier accepts the token.
 */

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';
import type { TokenVerifier } from '../auth/types.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Create an auth middleware with the given token verifiers.
 *
 * The middleware:
 * 1. Extracts "Bearer <token>" from the Authorization header
 * 2. Tries each verifier in order until one succeeds
 * 3. Sets userId and authProvider on the context
 * 4. Throws UnauthorizedError if no verifier accepts the token
 */
export function createAuthMiddleware(verifiers: TokenVerifier[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('Authorization');

    if (!header) {
      throw new UnauthorizedError('Missing Authorization header');
    }

    if (!header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authorization header must use Bearer scheme');
    }

    const token = header.slice(7).trim();
    if (!token) {
      throw new UnauthorizedError('Empty bearer token');
    }

    if (token.length > 8192) {
      throw new UnauthorizedError('Token exceeds maximum length');
    }

    for (const verifier of verifiers) {
      const result = await verifier.verify(token);
      if (result) {
        c.set('userId', result.user.id);
        c.set('authProvider', result.user.provider);
        await next();
        return;
      }
    }

    throw new UnauthorizedError('Invalid or expired token');
  });
}
