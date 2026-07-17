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

const queryClient = new QueryClient();

// Configure the token getter for Orval generated hooks
setAuthTokenGetter(() => localStorage.getItem('erp_access_token'));

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [location, setLocation] = useLocation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

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

function Router() {
  return (
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
  );
}

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
