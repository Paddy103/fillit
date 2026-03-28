import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { DevTokenVerifier } from '../auth/dev-verifier.js';
import type { TokenVerifier } from '../auth/types.js';

// ─── DevTokenVerifier ──────────────────────────────────────────────

describe('DevTokenVerifier', () => {
  const verifier = new DevTokenVerifier();

  it('should have provider set to "dev"', () => {
    expect(verifier.provider).toBe('dev');
  });

  it('should verify tokens with "dev:" prefix', async () => {
    const result = await verifier.verify('dev:user-123');
    expect(result).not.toBeNull();
    expect(result!.user.id).toBe('user-123');
    expect(result!.user.provider).toBe('dev');
    expect(result!.user.email).toBe('user-123@dev.fillit.local');
  });

  it('should return null for tokens without "dev:" prefix', async () => {
    expect(await verifier.verify('some-google-token')).toBeNull();
    expect(await verifier.verify('Bearer dev:user-1')).toBeNull();
    expect(await verifier.verify('')).toBeNull();
  });

  it('should return null for empty user ID after prefix', async () => {
    expect(await verifier.verify('dev:')).toBeNull();
    expect(await verifier.verify('dev:   ')).toBeNull();
  });

  it('should handle various user ID formats', async () => {
    const result1 = await verifier.verify('dev:abc');
    expect(result1!.user.id).toBe('abc');

    const result2 = await verifier.verify('dev:user@example.com');
    expect(result2!.user.id).toBe('user@example.com');

    const result3 = await verifier.verify('dev:12345');
    expect(result3!.user.id).toBe('12345');
  });
});

// ─── Auth Middleware ────────────────────────────────────────────────

describe('createAuthMiddleware', () => {
  const devVerifier = new DevTokenVerifier();

  function createApp(verifiers: TokenVerifier[]) {
    const app = new Hono<AppEnv>();
    app.use('*', createAuthMiddleware(verifiers));
    app.get('/test', (c) => {
      return c.json({
        userId: c.get('userId'),
        provider: c.get('authProvider'),
      });
    });
    app.onError((err, c) => {
      const status = 'statusCode' in err ? (err as any).statusCode : 500;
      return c.json({ error: err.message }, status);
    });
    return app;
  }

  it('should return 401 when Authorization header is missing', async () => {
    const app = createApp([devVerifier]);
    const res = await app.request('/test');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Missing Authorization header');
  });

  it('should return 401 when Authorization header is not Bearer', async () => {
    const app = createApp([devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Bearer');
  });

  it('should return 401 when token is empty', async () => {
    const app = createApp([devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(res.status).toBe(401);
  });

  it('should return 401 when no verifier accepts the token', async () => {
    const app = createApp([devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain('Invalid or expired token');
  });

  it('should set userId and authProvider on success with dev token', async () => {
    const app = createApp([devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer dev:test-user-42' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; provider: string };
    expect(body.userId).toBe('test-user-42');
    expect(body.provider).toBe('dev');
  });

  it('should try verifiers in order and use the first match', async () => {
    const mockVerifier: TokenVerifier = {
      provider: 'google',
      verify: vi.fn().mockResolvedValue({
        user: { id: 'google-user', provider: 'google', email: 'test@gmail.com' },
      }),
    };

    const app = createApp([mockVerifier, devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer some-token' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; provider: string };
    expect(body.userId).toBe('google-user');
    expect(body.provider).toBe('google');
  });

  it('should fall through to next verifier when first returns null', async () => {
    const rejectingVerifier: TokenVerifier = {
      provider: 'google',
      verify: vi.fn().mockResolvedValue(null),
    };

    const app = createApp([rejectingVerifier, devVerifier]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer dev:fallback-user' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; provider: string };
    expect(body.userId).toBe('fallback-user');
    expect(body.provider).toBe('dev');
  });

  it('should return 401 when verifiers list is empty', async () => {
    const app = createApp([]);
    const res = await app.request('/test', {
      headers: { Authorization: 'Bearer dev:user-1' },
    });
    expect(res.status).toBe(401);
  });
});

// ─── Registry ──────────────────────────────────────────────────────

describe('createVerifiers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('should include dev verifier in non-production by default', async () => {
    delete process.env.NODE_ENV;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.AUTH_DEV_TOKENS;

    const { createVerifiers } = await import('../auth/registry.js');
    const verifiers = createVerifiers();
    expect(verifiers.some((v) => v.provider === 'dev')).toBe(true);
  });

  it('should exclude dev verifier in production by default', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
    delete process.env.AUTH_DEV_TOKENS;

    // Re-import to pick up new env
    const mod = await import('../auth/registry.js');
    const verifiers = mod.createVerifiers();
    expect(verifiers.some((v) => v.provider === 'dev')).toBe(false);
  });

  it('should include google verifier when GOOGLE_CLIENT_ID is set', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-google-id';
    delete process.env.APPLE_CLIENT_ID;

    const { createVerifiers } = await import('../auth/registry.js');
    const verifiers = createVerifiers();
    expect(verifiers.some((v) => v.provider === 'google')).toBe(true);
  });

  it('should include apple verifier when APPLE_CLIENT_ID is set', async () => {
    process.env.APPLE_CLIENT_ID = 'test-apple-id';
    delete process.env.GOOGLE_CLIENT_ID;

    const { createVerifiers } = await import('../auth/registry.js');
    const verifiers = createVerifiers();
    expect(verifiers.some((v) => v.provider === 'apple')).toBe(true);
  });
});

// ─── App integration ───────────────────────────────────────────────

describe('app auth integration', () => {
  beforeEach(() => {
    process.env.AUTH_DEV_TOKENS = 'true';
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.APPLE_CLIENT_ID;
  });

  it('should allow unauthenticated access to /health', async () => {
    const app = (await import('../app.js')).default;
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });

  it('should allow unauthenticated access to /', async () => {
    const app = (await import('../app.js')).default;
    const res = await app.request('/');
    expect(res.status).toBe(200);
  });

  it('should require auth for /api/* routes', async () => {
    const app = (await import('../app.js')).default;
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should authenticate /api/* routes with dev token', async () => {
    const app = (await import('../app.js')).default;
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer dev:integration-test-user' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { userId: string; provider: string };
    expect(body.userId).toBe('integration-test-user');
    expect(body.provider).toBe('dev');
  });
});
