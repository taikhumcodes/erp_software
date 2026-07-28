import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProductPerformanceWidgetProps {
  data: any;
  isLoading: boolean;
}

export const ProductPerformanceWidget: React.FC<ProductPerformanceWidgetProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Product Performance Analytics (Top Sellers)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.topProducts.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{product.sku}</TableCell>
                <TableCell className="text-right">{product.unitsSold}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{fmt(product.revenue)}</TableCell>
                <TableCell className="text-right text-blue-600">{fmt(product.profit)}</TableCell>
                <TableCell className="text-right">{product.currentStock}</TableCell>
              </TableRow>
            ))}
            {data.topProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  No product sales data found for the selected period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
