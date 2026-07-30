import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { DashboardHeader } from '../modules/dashboard/components/DashboardHeader';
import { ExecutiveDashboard } from '../modules/dashboard/views/ExecutiveDashboard';
import { InventoryDashboard } from '../modules/dashboard/views/InventoryDashboard';
import { SalesDashboard } from '../modules/dashboard/views/SalesDashboard';

export default function Dashboard() {
  const { data: user } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey()
    }
  });

  // Determine the correct dashboard view based on user role.
  // For Phase 1, we default to ExecutiveDashboard.
  const role = user?.role || 'OWNER';

  return (
    <div className="p-2 md:p-6 pb-24 md:pb-6 space-y-6">
      <DashboardHeader userName={user?.name} />
      
      {/* RBAC View Switching */}
      {role === 'OWNER' || role === 'ADMIN' || role === 'MANAGER' ? (
        <ExecutiveDashboard />
      ) : role === 'WAREHOUSE' ? (
        <InventoryDashboard />
      ) : role === 'SALES' ? (
        <SalesDashboard />
      ) : (
        <ExecutiveDashboard />
      )}
    </div>
  );
}
