import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../store';
import { 
  useDashboardKPIs,
  useDashboardFinancial,
  useDashboardCenters,
  useDashboardOperations
} from '../api';
import { KPICard } from '../components/KPICard';
import { FinancialAnalyticsWidget } from '../components/FinancialAnalyticsWidget';
import { ReceivablesCenter, PayablesCenter } from '../components/FinancialCenters';
import { ActionCenterWidget } from '../components/ActionCenterWidget';
import { Wallet, CreditCard, TrendingUp, DollarSign } from 'lucide-react';

export const FinancialDashboard = () => {
  const { t } = useTranslation();
  const { startDate, endDate } = useDashboardStore();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(startDate, endDate);
  const { data: financials, isLoading: finLoading } = useDashboardFinancial(startDate, endDate);
  const { data: centers, isLoading: centersLoading } = useDashboardCenters();
  const { data: operations, isLoading: opsLoading } = useDashboardOperations(startDate, endDate);

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  if (kpisLoading || !kpis) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Gross Profit" value={fmt(kpis.profit.grossProfit)} icon={TrendingUp} colorClass="text-green-600" bgClass="bg-green-100 dark:bg-green-900/20" />
        <KPICard title="Net Cash Balance" value={fmt(kpis.balances.cashBalance)} icon={Wallet} colorClass="text-primary" bgClass="bg-primary/10" />
        <KPICard title="Total Receivables" value={fmt(kpis.receivables)} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-100 dark:bg-blue-900/20" />
        <KPICard title="Total Payables" value={fmt(kpis.payables)} icon={DollarSign} colorClass="text-orange-600" bgClass="bg-orange-100 dark:bg-orange-900/20" />
      </div>

      <FinancialAnalyticsWidget data={financials} isLoading={finLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ReceivablesCenter data={centers} isLoading={centersLoading} />
          <PayablesCenter data={centers} isLoading={centersLoading} />
        </div>
        <div className="lg:col-span-1">
          <ActionCenterWidget data={operations} isLoading={opsLoading} />
        </div>
      </div>
    </div>
  );
};
