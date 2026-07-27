import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useLogin } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { Box } from 'lucide-react';

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
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 mb-4">
            <img src="/logo.png" alt="Shield Max Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t('app_name')}</h1>
          <p className="text-muted-foreground text-sm mt-2">{t('welcome_back')}</p>
        </div>

        <div className="bg-card rounded-lg shadow-sm border p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground transition-shadow"
                placeholder="admin@shieldmax.com"
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground transition-shadow"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-sm"
            >
              {loginMutation.isPending ? t('logging_in') : t('sign_in')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
