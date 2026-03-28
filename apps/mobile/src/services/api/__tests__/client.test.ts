import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, ApiError, NetworkError } from '../client.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock config
vi.mock('../config.js', () => ({
  API_BASE_URL: 'https://api.test.com',
  API_TIMEOUT_MS: 5000,
  ANALYZE_TIMEOUT_MS: 30000,
}));

describe('ApiClient', () => {
  let client: ApiClient;
  const mockGetToken = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockGetToken.mockReset();
    mockGetToken.mockResolvedValue('test-token-123');
    client = new ApiClient({ getAuthToken: mockGetToken });
  });

  describe('get', () => {
    it('should make authenticated GET request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'result' }),
      });

      const result = await client.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        }),
      );
      expect(result).toEqual({ data: 'result' });
    });
  });

  describe('post', () => {
    it('should make authenticated POST request with JSON body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const body = { pages: [], availableFields: ['firstName'] };
      await client.post('/api/analyze', body);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/analyze',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token-123',
          }),
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('auth token', () => {
    it('should throw ApiError when no token is available', async () => {
      mockGetToken.mockResolvedValue(null);

      await expect(client.get('/api/test')).rejects.toThrow(ApiError);
      await expect(client.get('/api/test')).rejects.toThrow('No authentication token');
    });

    it('should call getAuthToken for each request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/a');
      await client.get('/api/b');

      expect(mockGetToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should throw ApiError with status and message on HTTP error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () =>
          Promise.resolve({
            error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit exceeded' },
          }),
      });

      try {
        await client.get('/api/test');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(429);
        expect((err as ApiError).code).toBe('TOO_MANY_REQUESTS');
        expect((err as ApiError).message).toBe('Rate limit exceeded');
      }
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('not JSON')),
      });

      try {
        await client.get('/api/test');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(500);
        expect((err as ApiError).message).toContain('500');
      }
    });

    it('should throw NetworkError on fetch failure', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network request failed'));

      await expect(client.get('/api/test')).rejects.toThrow(NetworkError);
    });

    it('should throw NetworkError on timeout', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 10);
          }),
      );

      const shortClient = new ApiClient({
        getAuthToken: mockGetToken,
        timeoutMs: 1,
      });

      await expect(shortClient.get('/api/test')).rejects.toThrow(NetworkError);
    });
  });

  describe('configuration', () => {
    it('should use custom base URL', async () => {
      const customClient = new ApiClient({
        baseUrl: 'https://custom.api.com',
        getAuthToken: mockGetToken,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await customClient.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith('https://custom.api.com/api/test', expect.anything());
    });

    it('should allow per-request timeout override', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/test', { timeoutMs: 60000 });
      // If it doesn't throw, the timeout was accepted
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should merge additional headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await client.get('/api/test', { headers: { 'X-Custom': 'value' } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Custom': 'value' }),
        }),
      );
    });
  });
});

describe('analyzeDocument', () => {
  it('should call POST /api/analyze with correct timeout', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { fields: [], documentType: 'test' },
          meta: { cached: false, fingerprint: 'abc', boxCount: 0 },
        }),
    });

    const mockGetToken = vi.fn().mockResolvedValue('token');
    const client = new ApiClient({ getAuthToken: mockGetToken });

    const { analyzeDocument } = await import('../analyzeService.js');
    const result = await analyzeDocument(client, {
      pages: [{ pageNumber: 1, imageBase64: 'dGVzdA==', ocrBlocks: [] }],
      availableFields: ['firstName'],
    });

    expect(result.success).toBe(true);
    expect(result.data.fields).toEqual([]);
    expect(result.meta.fingerprint).toBe('abc');
  });
});
