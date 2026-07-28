import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SupplierAnalyticsWidgetProps {
  data: any;
  isLoading: boolean;
}

export const SupplierAnalyticsWidget: React.FC<SupplierAnalyticsWidgetProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Suppliers Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead className="text-right">Outstanding (We Owe)</TableHead>
              <TableHead>Last Purchase</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((supplier: any) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-right font-semibold text-orange-600">{fmt(supplier.totalPurchases)}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(supplier.outstanding)}</TableCell>
                <TableCell>{supplier.lastPurchase ? new Date(supplier.lastPurchase).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={supplier.status === 'Active' ? 'default' : 'secondary'}>
                    {supplier.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No supplier data found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
