import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface ActiveCustomersListWidgetProps {
  data: any;
  isLoading: boolean;
}

export const ActiveCustomersListWidget: React.FC<ActiveCustomersListWidgetProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  // Filter only active customers if needed, or assume data is already active customers
  const activeCustomers = data.filter((c: any) => c.status === 'ACTIVE' || c.isActive !== false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-x-2">
        <Users className="w-5 h-5 text-indigo-600" />
        <CardTitle className="text-lg">Active Customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active customers found.</p>
          ) : (
            activeCustomers.map((customer: any) => (
              <div key={customer.id} className="flex items-center justify-between">
                <span className="font-medium text-sm">{customer.name}</span>
                <span className="text-xs text-muted-foreground">{customer.email || 'N/A'}</span>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
