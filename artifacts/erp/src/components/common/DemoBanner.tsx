import React, { useState } from 'react';
import { AlertCircle, ShieldAlert, Clock, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

interface DemoBannerProps {
  demoExpiresAt?: string | null;
}

export default function DemoBanner({ demoExpiresAt }: DemoBannerProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Compute days/hours remaining
  let timeRemainingText = '7 Days Evaluation';
  if (demoExpiresAt) {
    const expiry = new Date(demoExpiresAt).getTime();
    const now = Date.now();
    const diffMs = expiry - now;
    if (diffMs > 0) {
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      timeRemainingText = days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
    } else {
      timeRemainingText = 'Access Expired';
    }
  }

  if (collapsed) {
    return (
      <div className="bg-amber-500 text-white text-xs px-4 py-1 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-2 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trial Demo Sandbox Active</span>
        </div>
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 hover:underline text-[11px] opacity-90"
        >
          <span>Expand details</span>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex flex-wrap items-center justify-between shadow-md shrink-0 border-b border-amber-400/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex items-center gap-1 bg-white/20 text-white px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border border-white/20">
          <ShieldAlert className="w-3.5 h-3.5" />
          Trial Demo Mode
        </span>
        <span className="truncate">
          Interactive Evaluation Sandbox &bull; Showing synthetic hardware supply data. Real client data is protected and hidden.
        </span>
      </div>

      <div className="flex items-center gap-4 mt-1 sm:mt-0">
        <span className="inline-flex items-center gap-1.5 bg-black/20 text-amber-100 px-2.5 py-0.5 rounded-md text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-amber-200" />
          {timeRemainingText}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-amber-100 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
          title="Minimize banner"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
