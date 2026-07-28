import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../store';
import { 
  useDashboardKPIs,
  useDashboardSales,
  useDashboardCustomers,
  useDashboardOperations
} from '../api';
import { KPICard } from '../components/KPICard';
import { ProductPerformanceWidget } from '../components/ProductPerformanceWidget';
import { CustomerAnalyticsWidget } from '../components/CustomerAnalyticsWidget';
import { ActionCenterWidget } from '../components/ActionCenterWidget';
import { TrendingUp, Users, ShoppingCart, Truck } from 'lucide-react';

export const SalesDashboard = () => {
  const { t } = useTranslation();
  const { startDate, endDate } = useDashboardStore();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(startDate, endDate);
  const { data: sales, isLoading: salesLoading } = useDashboardSales(startDate, endDate);
  const { data: customers, isLoading: custLoading } = useDashboardCustomers(startDate, endDate);
  const { data: operations, isLoading: opsLoading } = useDashboardOperations(startDate, endDate);

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  if (kpisLoading || !kpis) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Sales" value={fmt(kpis.sales.totalRevenue)} icon={TrendingUp} colorClass="text-green-600" bgClass="bg-green-100 dark:bg-green-900/20" />
        <KPICard title="Sales Collections" value={fmt(kpis.sales.totalCollections)} icon={ShoppingCart} colorClass="text-primary" bgClass="bg-primary/10" />
        <KPICard title="Active Customers" value={kpis.counts.customers} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-100 dark:bg-blue-900/20" />
        <KPICard title="Pending Deliveries" value={kpis.counts.pendingDeliveries} icon={Truck} colorClass="text-orange-600" bgClass="bg-orange-100 dark:bg-orange-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ProductPerformanceWidget data={sales} isLoading={salesLoading} />
          <CustomerAnalyticsWidget data={customers} isLoading={custLoading} />
        </div>
        <div className="lg:col-span-1">
          <ActionCenterWidget data={operations} isLoading={opsLoading} />
        </div>
      </div>
    </div>
  );
};
