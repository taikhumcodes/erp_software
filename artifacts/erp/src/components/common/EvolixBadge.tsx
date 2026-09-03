import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

interface EvolixBadgeProps {
  source: 'SIDEBAR' | 'LOGIN_PAGE';
  variant?: 'sidebar' | 'subtle' | 'login';
  className?: string;
}

const EVOLIX_URL = 'https://evolix-studio.in/contact';

export function EvolixBadge({ source, variant = 'sidebar', className = '' }: EvolixBadgeProps) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Fire tracking asynchronously without blocking navigation
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const payload = JSON.stringify({ source, targetUrl: EVOLIX_URL });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/track', blob);
      } else {
        void api.post('/api/analytics/track', { source, targetUrl: EVOLIX_URL });
      }
    } catch {
      // Ignore tracking network errors so redirect always succeeds
    }
  };

  const text = isAr ? 'تطوير بواسطة إيفوليكس ستوديو' : 'Developed by Evolix Studio';

  if (variant === 'login') {
    return (
      <a
        href={EVOLIX_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group ${className}`}
        title={text}
      >
        <span>{text}</span>
        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <div className={`p-3 border-t border-border/60 bg-background/50 ${className}`}>
      <a
        href={EVOLIX_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-accent/30 hover:bg-accent/70 border border-border/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-all shadow-2xs"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-2 ring-emerald-500/20" />
          <span className="truncate">{text}</span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
}

export default EvolixBadge;
