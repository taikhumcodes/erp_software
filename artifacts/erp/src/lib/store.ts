import { create } from 'zustand';

interface AuthState {
  /** True only after the startup hydration check has confirmed the token is valid. */
  isAuthenticated: boolean;
  /**
   * True while we are verifying stored tokens on application startup.
   * ProtectedRoute renders a loading spinner during this window so that
   * pages never attempt API calls with a potentially-expired access token.
   */
  isHydrating: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  /** Called after successful login OR after a successful startup hydration. */
  login: (access: string, refresh: string) => void;
  logout: () => void;
  /** Used by the startup hydrator to flip the loading flag. */
  setHydrating: (v: boolean) => void;
}

// Tokens present in localStorage?  If so, we need to verify them before
// showing any protected route — hence isHydrating starts as true.
const storedAccess = localStorage.getItem('erp_access_token');
const storedRefresh = localStorage.getItem('erp_refresh_token');
const hasStoredTokens = !!(storedAccess && storedRefresh);

export const useAuthStore = create<AuthState>((set) => ({
  // Never trust "isAuthenticated" from localStorage directly — the access
  // token may have expired while the browser was closed.  Always start as
  // false and let the hydrator confirm validity.
  isAuthenticated: false,
  isHydrating: hasStoredTokens,
  accessToken: storedAccess,
  refreshToken: storedRefresh,

  login: (access: string, refresh: string) => {
    localStorage.setItem('erp_access_token', access);
    localStorage.setItem('erp_refresh_token', refresh);
    set({
      isAuthenticated: true,
      isHydrating: false,
      accessToken: access,
      refreshToken: refresh,
    });
  },

  logout: () => {
    localStorage.removeItem('erp_access_token');
    localStorage.removeItem('erp_refresh_token');
    set({
      isAuthenticated: false,
      isHydrating: false,
      accessToken: null,
      refreshToken: null,
    });
  },

  setHydrating: (v: boolean) => set({ isHydrating: v }),
}));
