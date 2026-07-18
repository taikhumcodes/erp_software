import { setAuthTokenGetter } from '@workspace/api-client-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { useEffect } from 'react';

// Setup i18n
import './i18n';
import './index.css';

// Import pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Users from '@/pages/users';
import Settings from '@/pages/settings';
import Categories from '@/pages/categories';
import Brands from '@/pages/brands';
import Units from '@/pages/units';
import Products from '@/pages/products';

// Import Layout
import AppLayout from '@/components/layout/app-layout';
import { useAuthStore } from '@/lib/store';
import { attemptTokenRefresh, setLogoutHandler, triggerLogout } from '@/lib/auth-refresh';

const queryClient = new QueryClient();

// The Orval-generated hooks always read the token fresh from localStorage,
// so updating localStorage (in attemptTokenRefresh) is all that is needed.
setAuthTokenGetter(() => localStorage.getItem('erp_access_token'));

// ── Startup hydration ──────────────────────────────────────────────────────
//
// When the page loads (or is refreshed), if we have stored tokens we must
// validate them BEFORE rendering any protected content.  The access token
// (15-min TTL) may have expired; in that case we silently refresh it.
//
// Flow:
//   1. Try GET /api/auth/me with the stored access token.
//   2. 200 → tokens are valid → mark isAuthenticated.
//   3. 401 → attempt refresh → on success retry /me → mark isAuthenticated.
//   4. Any failure → clear auth → redirect to /login.
// ───────────────────────────────────────────────────────────────────────────
function AuthHydrator() {
  const { login, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  // Register the logout handler so that api.ts can redirect on 401 after
  // a failed refresh (works even after hydration is complete).
  useEffect(() => {
    setLogoutHandler(() => {
      logout();
      setLocation('/login');
    });
    return () => setLogoutHandler(() => {});
  }, [logout, setLocation]);

  // Run the startup validation exactly once.
  useEffect(() => {
    const isHydrating = useAuthStore.getState().isHydrating;
    if (!isHydrating) return;

    let cancelled = false;

    async function hydrate() {
      // Step 1: try the current access token.
      let token = localStorage.getItem('erp_access_token');
      let meRes = await fetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // Step 2: expired → try to refresh silently.
      if (meRes.status === 401) {
        const newToken = await attemptTokenRefresh();
        if (newToken) {
          meRes = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${newToken}` },
          });
          token = newToken;
        }
      }

      if (cancelled) return;

      if (meRes.ok) {
        // Tokens are confirmed valid — restore authenticated state.
        const access = localStorage.getItem('erp_access_token')!;
        const refresh = localStorage.getItem('erp_refresh_token')!;
        login(access, refresh);
      } else {
        // Both access token and refresh token are invalid — force re-login.
        triggerLogout();
        setLocation('/login');
      }
    }

    hydrate().catch(() => {
      if (!cancelled) {
        triggerLogout();
        setLocation('/login');
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ── Protected route ────────────────────────────────────────────────────────
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isHydrating = useAuthStore(state => state.isHydrating);

  // Still validating stored tokens — show a neutral loading screen.
  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!isAuthenticated && location !== '/login') {
      setLocation('/login');
    }
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────
function Router() {
  return (
    <>
      <AuthHydrator />
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/users">
          <ProtectedRoute component={Users} />
        </Route>
        <Route path="/settings">
          <ProtectedRoute component={Settings} />
        </Route>
        <Route path="/categories">
          <ProtectedRoute component={Categories} />
        </Route>
        <Route path="/brands">
          <ProtectedRoute component={Brands} />
        </Route>
        <Route path="/units">
          <ProtectedRoute component={Units} />
        </Route>
        <Route path="/products">
          <ProtectedRoute component={Products} />
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
