import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinancialCentersProps {
  data: any;
  isLoading: boolean;
}

export const ReceivablesCenter: React.FC<FinancialCentersProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Receivables Center (Money to Receive)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Outstanding Amount</TableHead>
              <TableHead className="text-right">Unpaid Invoices</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.receivables.map((customer: any) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="text-right font-semibold text-blue-600">{fmt(customer.balance)}</TableCell>
                <TableCell className="text-right">{customer.invoices}</TableCell>
              </TableRow>
            ))}
            {data.receivables.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  No outstanding receivables.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const PayablesCenter: React.FC<FinancialCentersProps> = ({ data, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading || !data) {
    return <div className="animate-pulse h-64 bg-muted rounded-xl w-full" />;
  }

  const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(val);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payables Center (Money to Pay)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-right">Outstanding Amount</TableHead>
              <TableHead className="text-right">Unpaid Bills</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.payables.map((supplier: any) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell className="text-right font-semibold text-orange-600">{fmt(supplier.balance)}</TableCell>
                <TableCell className="text-right">{supplier.bills}</TableCell>
              </TableRow>
            ))}
            {data.payables.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  No outstanding payables.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
