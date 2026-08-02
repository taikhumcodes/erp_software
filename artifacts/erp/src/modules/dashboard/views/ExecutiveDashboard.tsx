import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Package,
  Users,
  Building2,
  DollarSign
} from 'lucide-react';
import { useDashboardStore } from '../store';
import { 
  useDashboardKPIs, 
  useDashboardInventory, 
  useDashboardFinancial,
  useDashboardCustomers,
  useDashboardSuppliers,
  useDashboardSales,
  useDashboardOperations,
  useDashboardHealth,
  useDashboardCenters
} from '../api';
import { KPICard } from '../components/KPICard';
import { FinancialAnalyticsWidget } from '../components/FinancialAnalyticsWidget';
import { CustomerAnalyticsWidget } from '../components/CustomerAnalyticsWidget';
import { SupplierAnalyticsWidget } from '../components/SupplierAnalyticsWidget';
import { ProductPerformanceWidget } from '../components/ProductPerformanceWidget';
import { StockCoverageWidget, SmartReorderWidget, DeadStockWidget } from '../components/InventoryIntelligenceWidgets';
import { ReceivablesCenter, PayablesCenter } from '../components/FinancialCenters';
import { BusinessHealthScore } from '../components/BusinessHealthScore';
import { ActionCenterWidget } from '../components/ActionCenterWidget';
import { PartnerCapitalWidget } from '../components/PartnerCapitalWidget';
import { ActiveCustomersListWidget } from '../components/ActiveCustomersListWidget';

export const ExecutiveDashboard = () => {
  const { t } = useTranslation();
  const { startDate, endDate } = useDashboardStore();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(startDate, endDate);
  const { data: inventory, isLoading: invLoading } = useDashboardInventory(startDate, endDate);
  const { data: financials, isLoading: finLoading } = useDashboardFinancial(startDate, endDate);
  const { data: customers, isLoading: custLoading } = useDashboardCustomers(startDate, endDate);
  const { data: suppliers, isLoading: supLoading } = useDashboardSuppliers(startDate, endDate);
  const { data: sales, isLoading: salesLoading } = useDashboardSales(startDate, endDate);
  const { data: operations, isLoading: opsLoading } = useDashboardOperations(startDate, endDate);
  const { data: health, isLoading: healthLoading } = useDashboardHealth(startDate, endDate);
  const { data: centers, isLoading: centersLoading } = useDashboardCenters();

  if (kpisLoading || !kpis) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-32 bg-muted rounded-xl w-full" />
          <div className="h-32 bg-muted rounded-xl w-full" />
          <div className="h-32 bg-muted rounded-xl w-full" />
          <div className="h-32 bg-muted rounded-xl w-full" />
        </div>
        <div className="h-64 bg-muted rounded-xl w-full" />
      </div>
    );
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Sales" value={fmt(kpis.sales.totalRevenue)} icon={TrendingUp} colorClass="text-green-600" bgClass="bg-green-100 dark:bg-green-900/20" />
        <KPICard title="Gross Profit" value={fmt(kpis.profit.grossProfit)} icon={Wallet} colorClass="text-primary" bgClass="bg-primary/10" />
        <KPICard title="Total Receivables" value={fmt(kpis.receivables)} icon={CreditCard} colorClass="text-blue-600" bgClass="bg-blue-100 dark:bg-blue-900/20" />
        <KPICard title="Inventory Value" value={fmt(kpis.balances.inventoryValue)} icon={Package} colorClass="text-purple-600" bgClass="bg-purple-100 dark:bg-purple-900/20" />
      </div>
      
      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <KPICard title="Total Purchases" value={fmt(kpis.purchases.totalCost)} icon={ShoppingCart} colorClass="text-orange-600" bgClass="bg-orange-100 dark:bg-orange-900/20" />
        <KPICard title="Total Balance" value={fmt(kpis.balances.totalBalance)} icon={DollarSign} colorClass="text-teal-600" bgClass="bg-teal-100 dark:bg-teal-900/20" />
        <KPICard title="Bank Balance" value={fmt(kpis.balances.bankBalance)} icon={Building2} colorClass="text-blue-600" bgClass="bg-blue-100 dark:bg-blue-900/20" />
        <KPICard title="Cash Balance" value={fmt(kpis.balances.cashBalance)} icon={Wallet} colorClass="text-emerald-600" bgClass="bg-emerald-100 dark:bg-emerald-900/20" />
        <KPICard title="Total Payables" value={fmt(kpis.payables)} icon={CreditCard} colorClass="text-red-600" bgClass="bg-red-100 dark:bg-red-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <FinancialAnalyticsWidget data={financials} isLoading={finLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReceivablesCenter data={centers} isLoading={centersLoading} />
            <PayablesCenter data={centers} isLoading={centersLoading} />
          </div>

          <ProductPerformanceWidget data={sales} isLoading={salesLoading} />
          
          <StockCoverageWidget data={inventory} isLoading={invLoading} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CustomerAnalyticsWidget data={customers} isLoading={custLoading} />
            <SupplierAnalyticsWidget data={suppliers} isLoading={supLoading} />
          </div>

          <SmartReorderWidget data={inventory} isLoading={invLoading} />
          <DeadStockWidget data={inventory} isLoading={invLoading} />
        </div>

        {/* Sidebar / Action Area */}
        <div className="lg:col-span-1 space-y-6">
          <ActiveCustomersListWidget data={customers} isLoading={custLoading} />
          <PartnerCapitalWidget />
          <BusinessHealthScore data={health} isLoading={healthLoading} />
          <ActionCenterWidget data={operations} isLoading={opsLoading} />
        </div>
      </div>
    </div>
  );
};
