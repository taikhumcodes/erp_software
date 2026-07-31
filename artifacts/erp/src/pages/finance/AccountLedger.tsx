import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Download, Printer } from 'lucide-react';
import type { FinanceLedgerResponse, FinanceAccount } from '@/lib/finance-types';
import { format } from 'date-fns';

const ENTRY_BADGES: Record<string, { label: string, color: string }> = {
  OPENING_BALANCE: { label: 'Opening', color: 'bg-gray-100 text-gray-700' },
  SALE_PAYMENT: { label: 'Sale', color: 'bg-green-100 text-green-700' },
  PURCHASE_PAYMENT: { label: 'Purchase', color: 'bg-orange-100 text-orange-700' },
  EXPENSE: { label: 'Expense', color: 'bg-red-100 text-red-700' },
  SALARY: { label: 'Salary', color: 'bg-purple-100 text-purple-700' },
  TRANSFER_IN: { label: 'Transfer In', color: 'bg-blue-100 text-blue-700' },
  TRANSFER_OUT: { label: 'Transfer Out', color: 'bg-indigo-100 text-indigo-700' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-700' },
};

export default function AccountLedger() {
  const { accountId: urlAccountId } = useParams();
  const [selectedAccountId, setSelectedAccountId] = useState(urlAccountId || '');
  const [, setLocation] = useLocation();

  // Load accounts list
  const { data: accountsData } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => FinanceAPI.getAccounts(),
  });
  const accounts: FinanceAccount[] = accountsData?.data || [];

  // Default to first account if none selected
  if (!selectedAccountId && accounts.length > 0) {
    setSelectedAccountId(accounts[0].id);
  }

  // Load ledger
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['finance-ledger', selectedAccountId],
    queryFn: () => FinanceAPI.getLedger(selectedAccountId),
    enabled: !!selectedAccountId,
  });

  const ledger: FinanceLedgerResponse | undefined = ledgerData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">Transaction history and running balance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Statement
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" /> Export Excel
          </Button>
        </div>
      </div>

      <div className="flex gap-4 print:hidden">
        <div className="w-72">
          <Select value={selectedAccountId} onValueChange={(val) => { setSelectedAccountId(val); setLocation(`/finance/ledger/${val}`); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select Account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      ) : !ledger || !ledger.account ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Please select a valid account</CardContent></Card>
      ) : (
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-0">
            {/* Print Header */}
            <div className="hidden print:block p-8 border-b text-center">
              <h2 className="text-2xl font-bold">Account Statement</h2>
              <p className="text-lg mt-2">{ledger.account.name}</p>
              <p className="text-sm text-gray-500 mt-1">Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
            </div>

            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit (-)</TableHead>
                  <TableHead className="text-right">Credit (+)</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.entries.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
                ) : (
                  ledger.entries.map((entry) => {
                    const badge = ENTRY_BADGES[entry.entryType] || { label: entry.entryType, color: 'bg-gray-100' };
                    const debit = Number(entry.debit);
                    const credit = Number(entry.credit);
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.referenceNumber || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${badge.color} border-transparent text-xs font-semibold`}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={entry.description}>{entry.description}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">
                          {debit > 0 ? (
                            <div className="flex items-center justify-end"><ArrowDownLeft className="w-3 h-3 mr-1 opacity-50" /> {debit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}</div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {credit > 0 ? (
                            <div className="flex items-center justify-end"><ArrowUpRight className="w-3 h-3 mr-1 opacity-50" /> {credit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}</div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap">
                          {Number(entry.runningBalance).toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
