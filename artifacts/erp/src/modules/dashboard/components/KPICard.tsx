import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  colorClass?: string;
  bgClass?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  trendLabel = 'vs last period',
  colorClass = 'text-primary',
  bgClass = 'bg-primary/10'
}) => {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mt-2 tracking-tight" dir="ltr">{value}</h3>
        </div>
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgClass)}>
          <Icon className={cn('w-6 h-6', colorClass)} />
        </div>
      </div>
      
      {trend && trendValue && (
        <div className="mt-4 flex items-center text-sm">
          {trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500 mr-1 rtl:ml-1 rtl:mr-0" />}
          {trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500 mr-1 rtl:ml-1 rtl:mr-0" />}
          
          <span className={cn(
            'font-medium',
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
          )} dir="ltr">
            {trendValue}
          </span>
          <span className="text-muted-foreground ml-2 rtl:mr-2 rtl:ml-0">{trendLabel}</span>
        </div>
      )}
    </div>
  );
};
