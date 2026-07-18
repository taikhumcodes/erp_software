/**
 * Singleton token-refresh utility.
 *
 * Deduplicates concurrent 401 retries so that if five requests fail at the
 * same time only ONE POST /api/auth/refresh is issued.  All callers await the
 * same in-flight promise and receive the same new access token.
 */

type LogoutFn = () => void;
let _onLogout: LogoutFn | null = null;

/** Register the function that clears React state and redirects to /login. */
export function setLogoutHandler(fn: LogoutFn): void {
  _onLogout = fn;
}

/**
 * Clear stored tokens and invoke the registered logout handler.
 * Safe to call even before the handler is registered (tokens are still cleared).
 */
export function triggerLogout(): void {
  localStorage.removeItem('erp_access_token');
  localStorage.removeItem('erp_refresh_token');
  _onLogout?.();
}

// In-flight refresh promise — shared across all concurrent callers.
let _refreshing: Promise<string | null> | null = null;

/**
 * Exchange the stored refresh token for a new access token.
 *
 * - Returns the new access token on success (also persists it to localStorage).
 * - Returns null when there is no refresh token or the server rejects it.
 * - Concurrent calls are collapsed: only one HTTP request is made.
 */
export async function attemptTokenRefresh(): Promise<string | null> {
  if (_refreshing) return _refreshing;

  _refreshing = (async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('erp_refresh_token');
    if (!refreshToken) return null;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const data = await res.json() as {
        tokens: { accessToken: string; refreshToken: string };
      };

      const { accessToken, refreshToken: newRefreshToken } = data.tokens;
      localStorage.setItem('erp_access_token', accessToken);
      localStorage.setItem('erp_refresh_token', newRefreshToken);
      return accessToken;
    } catch {
      return null;
    } finally {
      _refreshing = null;
    }
  })();

  return _refreshing;
}
