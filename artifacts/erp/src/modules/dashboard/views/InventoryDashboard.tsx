import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDashboardStore } from '../store';
import { 
  useDashboardKPIs,
  useDashboardInventory,
  useDashboardOperations
} from '../api';
import { KPICard } from '../components/KPICard';
import { StockCoverageWidget, SmartReorderWidget, DeadStockWidget } from '../components/InventoryIntelligenceWidgets';
import { ActionCenterWidget } from '../components/ActionCenterWidget';
import { Package, AlertTriangle, ArrowDownToLine, ShoppingCart } from 'lucide-react';

export const InventoryDashboard = () => {
  const { t } = useTranslation();
  const { startDate, endDate } = useDashboardStore();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(startDate, endDate);
  const { data: inventory, isLoading: invLoading } = useDashboardInventory(startDate, endDate);
  const { data: operations, isLoading: opsLoading } = useDashboardOperations(startDate, endDate);

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  if (kpisLoading || !kpis || invLoading || !inventory) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Inventory Value" value={fmt(kpis.balances.inventoryValue)} icon={Package} colorClass="text-primary" bgClass="bg-primary/10" />
        <KPICard title="Total Stock Units" value={inventory.summary.totalStockQty} icon={ShoppingCart} colorClass="text-blue-600" bgClass="bg-blue-100 dark:bg-blue-900/20" />
        <KPICard title="Low Stock Items" value={inventory.summary.lowStockCount} icon={AlertTriangle} colorClass="text-orange-600" bgClass="bg-orange-100 dark:bg-orange-900/20" />
        <KPICard title="Out of Stock Items" value={inventory.summary.outOfStockCount} icon={ArrowDownToLine} colorClass="text-red-600" bgClass="bg-red-100 dark:bg-red-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StockCoverageWidget data={inventory} isLoading={invLoading} />
          <SmartReorderWidget data={inventory} isLoading={invLoading} />
          <DeadStockWidget data={inventory} isLoading={invLoading} />
        </div>
        <div className="lg:col-span-1">
          <ActionCenterWidget data={operations} isLoading={opsLoading} />
        </div>
      </div>
    </div>
  );
};
