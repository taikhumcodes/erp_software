import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Package, 
  AlertTriangle 
} from 'lucide-react';
import { useDashboardStore } from '../store';
import { 
  useDashboardKPIs, 
  useDashboardInventory, 
  useDashboardCharts, 
  useDashboardOperations 
} from '../api';
import { KPICard } from '../components/KPICard';
// We will create these shortly
// import { RevenueChart } from '../components/RevenueChart';
// import { InventoryAlerts } from '../components/InventoryAlerts';
// import { OperationsTimeline } from '../components/OperationsTimeline';

export const ExecutiveDashboard = () => {
  const { t } = useTranslation();
  const { startDate, endDate } = useDashboardStore();

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs(startDate, endDate);
  const { data: inventory, isLoading: invLoading } = useDashboardInventory(startDate, endDate);
  const { data: charts } = useDashboardCharts(startDate, endDate);
  const { data: operations } = useDashboardOperations(startDate, endDate);

  if (kpisLoading || !kpis) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded-xl w-full" />
      <div className="h-32 bg-muted rounded-xl w-full" />
    </div>;
  }

  // Formatting helpers
  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Sales" 
          value={fmt(kpis.sales.totalRevenue)} 
          icon={TrendingUp} 
          colorClass="text-green-600" 
          bgClass="bg-green-100 dark:bg-green-900/20" 
        />
        <KPICard 
          title="Gross Profit" 
          value={fmt(kpis.profit.grossProfit)} 
          icon={Wallet} 
          colorClass="text-primary" 
          bgClass="bg-primary/10" 
        />
        <KPICard 
          title="Total Receivables" 
          value={fmt(kpis.receivables)} 
          icon={CreditCard} 
          colorClass="text-blue-600" 
          bgClass="bg-blue-100 dark:bg-blue-900/20" 
        />
        <KPICard 
          title="Total Purchases" 
          value={fmt(kpis.purchases.totalCost)} 
          icon={ShoppingCart} 
          colorClass="text-orange-600" 
          bgClass="bg-orange-100 dark:bg-orange-900/20" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px]">
             <h3 className="text-lg font-semibold mb-4">Revenue vs Expenses</h3>
             {/* Chart placeholder */}
             <div className="flex h-48 items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
               Chart Component (Recharts)
             </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
             <h3 className="text-lg font-semibold mb-4">Smart Inventory Intelligence</h3>
             {!invLoading && inventory ? (
               <div className="space-y-4">
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                   <div className="p-4 bg-muted/50 rounded-lg text-center">
                     <p className="text-xs text-muted-foreground">Total Value</p>
                     <p className="text-lg font-bold">{fmt(inventory.summary.totalValue)}</p>
                   </div>
                   <div className="p-4 bg-muted/50 rounded-lg text-center">
                     <p className="text-xs text-muted-foreground">Total Items</p>
                     <p className="text-lg font-bold">{inventory.summary.totalStockQty}</p>
                   </div>
                   <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-center border border-red-100 dark:border-red-900/20">
                     <p className="text-xs text-red-600 dark:text-red-400">Critical Stock</p>
                     <p className="text-lg font-bold text-red-700 dark:text-red-300">{inventory.summary.lowStockCount}</p>
                   </div>
                   <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg text-center border border-red-100 dark:border-red-900/20">
                     <p className="text-xs text-red-600 dark:text-red-400">Out of Stock</p>
                     <p className="text-lg font-bold text-red-700 dark:text-red-300">{inventory.summary.outOfStockCount}</p>
                   </div>
                 </div>
                 {/* Table placeholder */}
                 <div className="text-sm">Top Moving Products Table...</div>
               </div>
             ) : (
               <div className="animate-pulse h-32 bg-muted rounded" />
             )}
          </div>
        </div>

        {/* Sidebar Operations */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Action Center
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Requires immediate attention.
            </p>
            {/* Alerts placeholder */}
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            {operations && (
              <div className="space-y-4">
                {operations.recentActivity.map((act: any) => (
                  <div key={act.id} className="flex flex-col border-b last:border-0 pb-3 last:pb-0">
                    <span className="text-sm font-medium">{act.description}</span>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{act.user}</span>
                      <span>{new Date(act.time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
