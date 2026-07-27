import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../store';
import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

export const DashboardHeader: React.FC<{ userName?: string }> = ({ userName }) => {
  const { t } = useTranslation();
  const { dateFilter, setDateFilter } = useDashboardStore();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">{t('dashboard')}</h1>
        {userName && (
          <p className="text-muted-foreground mt-1">
            {t('welcome_back')}, <span className="font-semibold text-foreground">{userName}</span>
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 rtl:space-x-reverse">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <Select 
          value={dateFilter} 
          onValueChange={(val: any) => setDateFilter(val)}
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Select Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAY">Today</SelectItem>
            <SelectItem value="YESTERDAY">Yesterday</SelectItem>
            <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
            <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
            <SelectItem value="THIS_MONTH">This Month</SelectItem>
            <SelectItem value="LAST_MONTH">Last Month</SelectItem>
            <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
            <SelectItem value="THIS_YEAR">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
