/**
 * Lightweight fetch wrapper for product-management API calls.
 *
 * Features:
 * - Attaches the stored Bearer token to every request.
 * - On 401: automatically attempts a token refresh and retries the original
 *   request exactly once.
 * - On second 401 (or refresh failure): calls triggerLogout() to clear auth
 *   state and redirect to the login page.
 */

import { attemptTokenRefresh, triggerLogout } from './auth-refresh';

function getToken(): string | null {
  return localStorage.getItem('erp_access_token');
}

function buildHeaders(token: string | null, hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (hasBody) headers['Content-Type'] = 'application/json';
  return headers;
}

async function doFetch(
  method: string,
  path: string,
  body: unknown | undefined,
  token: string | null,
): Promise<Response> {
  const normalizedPath = path.startsWith('/api') ? path : `/api${path}`;

  return fetch(normalizedPath, {
    method,
    headers: buildHeaders(token, body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const payload = data as {
      message?: string;
      errors?: unknown;
      details?: { errors?: unknown };
    };
    const error = new Error(payload.message ?? `HTTP ${res.status}`) as Error & {
      errors?: unknown;
      details?: unknown;
    };
    error.errors = payload.errors ?? payload.details?.errors;
    error.details = payload.details;
    throw error;
  }
  return data as T;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  // ── First attempt ────────────────────────────────────────────────────────
  const firstRes = await doFetch(method, path, body, getToken());

  if (firstRes.status !== 401) {
    return parseResponse<T>(firstRes);
  }

  // ── 401: try to refresh ───────────────────────────────────────────────────
  const newToken = await attemptTokenRefresh();

  if (!newToken) {
    // Refresh token is missing or rejected — end the session.
    triggerLogout();
    throw new Error('Session expired. Please log in again.');
  }

  // ── Retry with the fresh access token ────────────────────────────────────
  const retryRes = await doFetch(method, path, body, newToken);

  if (retryRes.status === 401) {
    // Still unauthorized after a fresh token — something is wrong.
    triggerLogout();
    throw new Error('Session expired. Please log in again.');
  }

  return parseResponse<T>(retryRes);
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
