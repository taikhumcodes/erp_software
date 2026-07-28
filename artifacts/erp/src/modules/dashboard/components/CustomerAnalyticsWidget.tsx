import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CustomerAnalyticsWidgetProps {
  data: any;
  isLoading: boolean;
}

export const CustomerAnalyticsWidget: React.FC<CustomerAnalyticsWidgetProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Customers Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Avg Order Value</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((customer: any) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{fmt(customer.totalRevenue)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(customer.outstanding)}</TableCell>
                <TableCell className="text-right">{fmt(customer.avgOrderValue)}</TableCell>
                <TableCell>{customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'}>
                    {customer.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No customer data found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
