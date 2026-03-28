/**
 * HTTP client for the FillIt backend API.
 *
 * Thin wrapper around fetch with auth token injection, timeout,
 * structured error handling, and typed response parsing.
 */

import { API_BASE_URL, API_TIMEOUT_MS } from './config.js';

// ─── Types ─────────────────────────────────────────────────────────

export interface ApiClientConfig {
  /** Override base URL. */
  baseUrl?: string;
  /** Default timeout in milliseconds. */
  timeoutMs?: number;
  /** Function that returns the current auth token. */
  getAuthToken: () => Promise<string | null>;
}

export interface ApiRequestOptions {
  /** Override timeout for this request. */
  timeoutMs?: number;
  /** Additional headers. */
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.cause = cause;
  }
}

// ─── Client ────────────────────────────────────────────────────────

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private getAuthToken: () => Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl ?? API_BASE_URL;
    this.defaultTimeout = config.timeoutMs ?? API_TIMEOUT_MS;
    this.getAuthToken = config.getAuthToken;
  }

  /**
   * Make an authenticated GET request.
   */
  async get<T>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Make an authenticated POST request with JSON body.
   */
  async post<T>(path: string, body: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  // ─── Private ───────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: ApiRequestOptions,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeout;

    // Get auth token
    const token = await this.getAuthToken();
    if (!token) {
      throw new ApiError(401, 'NO_AUTH_TOKEN', 'No authentication token available');
    }

    // Build headers
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message =
          (errorBody as any)?.error?.message ??
          (errorBody as any)?.error ??
          `Request failed with status ${response.status}`;
        const code = (errorBody as any)?.error?.code ?? `HTTP_${response.status}`;
        throw new ApiError(response.status, code, message);
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) throw err;

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${timeoutMs}ms: ${method} ${path}`);
      }

      throw new NetworkError(`Network request failed: ${method} ${path}`, err);
    }
  }
}
