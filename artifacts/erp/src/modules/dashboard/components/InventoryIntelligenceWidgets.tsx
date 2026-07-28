import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface StockCoverageWidgetProps {
  data: any;
  isLoading: boolean;
}

export const StockCoverageWidget: React.FC<StockCoverageWidgetProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Stock Coverage Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Avg Daily Sales</TableHead>
              <TableHead className="text-right">Est. Days Remaining</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.stockCoverage.slice(0, 10).map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">{product.stockQuantity}</TableCell>
                <TableCell className="text-right">{Number(product.avgDailySales).toFixed(2)}</TableCell>
                <TableCell className="text-right">{product.daysRemaining > 900 ? '999+' : product.daysRemaining}</TableCell>
                <TableCell>
                  <Badge variant={
                    product.status === 'Healthy' ? 'default' : 
                    product.status === 'Critical' ? 'destructive' : 
                    product.status === 'Out of Stock' ? 'destructive' : 'secondary'
                  }>
                    {product.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {data.stockCoverage.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No inventory data available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const SmartReorderWidget: React.FC<StockCoverageWidgetProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const recommendations = data.lowStock || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Smart Reorder Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Minimum Stock</TableHead>
              <TableHead>Recommendation</TableHead>
              <TableHead>Priority</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recommendations.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">{product.stockQuantity}</TableCell>
                <TableCell className="text-right">{Math.ceil(product.minimumStock)}</TableCell>
                <TableCell>{product.reorderRecommendation}</TableCell>
                <TableCell>
                  <Badge variant={product.priority === 'Critical' ? 'destructive' : 'default'}>
                    {product.priority}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {recommendations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No products currently need reordering.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const DeadStockWidget: React.FC<StockCoverageWidgetProps> = ({ data, isLoading }) => {
  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const deadStock = data.deadStock || [];
  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Dead Stock Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Inventory Value</TableHead>
              <TableHead>No Sales For</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deadStock.map((product: any) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">{product.stockQuantity}</TableCell>
                <TableCell className="text-right text-red-600">{fmt(product.inventoryValue)}</TableCell>
                <TableCell>{product.deadStockDuration}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{product.deadStockRecommendation}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {deadStock.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                  No dead stock detected. Great job!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
