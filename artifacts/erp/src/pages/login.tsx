import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useLogin } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const login = useAuthStore(state => state.login);
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } }, {
      onSuccess: (data) => {
        login(data.tokens.accessToken, data.tokens.refreshToken);
        setLocation('/');
      },
      onError: () => {
        toast({
          title: "Login failed",
          description: "Please check your credentials and try again.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex bg-background">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-[#f97226] text-white flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden p-1">
            <img src="/logo.png" alt="Shield Max Logo" className="w-full h-full object-contain drop-shadow-md" />
          </div>
          <div>
            <div className="font-semibold text-lg leading-tight">Shield Max Company</div>
            <div className="text-sm text-white/80">Shop Management System</div>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-4 leading-tight text-white">
            One platform. Complete business control.
          </h1>
          <p className="text-lg text-white/90">
            From warehouse to accounting, streamline every operation with an enterprise-grade ERP.
          </p>
        </div>

        <div className="text-sm text-white/70">
          © 2026 Shield Max • Phase 1 Release
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-zinc-950">
        <div className="w-full max-w-md border border-border/50 rounded-2xl shadow-sm p-8 sm:p-10 bg-card">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your Shield Max workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t('email') || 'Email'}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f97226] focus:border-transparent bg-background text-foreground transition-shadow shadow-sm"
                placeholder="admin@shieldmax.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground block mb-1">
                {t('password') || 'Password'}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f97226] focus:border-transparent bg-background text-foreground transition-shadow shadow-sm"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-[#f97226] hover:bg-[#d54d09] text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {loginMutation.isPending ? (t('logging_in') || 'Signing in...') : (t('sign_in') || 'Sign in')}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
