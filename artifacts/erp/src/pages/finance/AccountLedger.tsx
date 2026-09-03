import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Download, 
  Printer, 
  FilterX, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt
} from 'lucide-react';
import type { FinanceLedgerResponse, FinanceAccount } from '@/lib/finance-types';
import { format } from 'date-fns';

const ENTRY_BADGES: Record<string, { label: string; color: string }> = {
  OPENING_BALANCE: { label: 'Opening Balance', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  SALE_PAYMENT: { label: 'Sale Payment', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200' },
  PURCHASE_PAYMENT: { label: 'Purchase Payment', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200' },
  EXPENSE: { label: 'Expense', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200' },
  SALARY: { label: 'Salary', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200' },
  SALARY_ADVANCE: { label: 'Salary Advance', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-300 border-fuchsia-200' },
  TRANSFER_IN: { label: 'Transfer In', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200' },
  TRANSFER_OUT: { label: 'Transfer Out', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200' },
  OWNER_INVESTMENT: { label: 'Owner Investment', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border-teal-200' },
  OWNER_WITHDRAWAL: { label: 'Owner Drawing', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200' },
  ADJUSTMENT: { label: 'Adjustment', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300 border-yellow-200' },
  PROFIT_SHARE: { label: 'Profit Share', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200' },
  MISC_INCOME: { label: 'Misc Income', color: 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-green-200' },
  MISC_EXPENSE: { label: 'Misc Expense', color: 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200' },
};

export default function AccountLedger() {
  const { accountId: urlAccountId } = useParams();
  const [selectedAccountId, setSelectedAccountId] = useState(urlAccountId || '');
  const [, setLocation] = useLocation();

  // Filters and Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

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

  // Build query string for ledger API
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (entryTypeFilter && entryTypeFilter !== 'ALL') params.set('entryType', entryTypeFilter);
    return params.toString();
  }, [page, pageSize, dateFrom, dateTo, entryTypeFilter]);

  // Load ledger with pagination and filters
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['finance-ledger', selectedAccountId, queryParams],
    queryFn: () => FinanceAPI.getLedger(selectedAccountId, queryParams),
    enabled: !!selectedAccountId,
  });

  const ledger: FinanceLedgerResponse | undefined = ledgerData;
  const currentAccount = accounts.find(a => a.id === selectedAccountId) || ledger?.account;

  const totalEntries = ledger?.meta?.total ?? 0;
  const totalPages = Math.max(1, ledger?.meta?.pages ?? Math.ceil(totalEntries / pageSize));
  const currentPage = ledger?.meta?.page ?? page;

  // Compute summary stats for current view
  const currentTotals = useMemo(() => {
    if (!ledger?.entries) return { debit: 0, credit: 0, closing: 0 };
    const debit = ledger.entries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
    const credit = ledger.entries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
    const lastEntry = ledger.entries[ledger.entries.length - 1];
    const closing = lastEntry ? Number(lastEntry.runningBalance) : 0;
    return { debit, credit, closing };
  }, [ledger?.entries]);

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val);
    setPage(1);
    setLocation(`/finance/ledger/${val}`);
  };

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setEntryTypeFilter('ALL');
    setPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = async () => {
    if (!selectedAccountId) return;
    try {
      setIsExporting(true);
      // Fetch full statement data for full export
      const statementParams = new URLSearchParams();
      if (dateFrom) statementParams.set('dateFrom', dateFrom);
      if (dateTo) statementParams.set('dateTo', dateTo);
      const res = await FinanceAPI.getStatement(selectedAccountId, statementParams.toString());
      const statement = res?.data;

      if (!statement || !statement.rows || statement.rows.length === 0) {
        alert('No data available to export');
        return;
      }

      // Build CSV content
      const headers = ['Date', 'Reference', 'Type', 'Description', 'Debit (-)', 'Credit (+)', 'Balance', 'Created By', 'Remarks'];
      const csvRows = [
        [`"Account: ${statement.account.name} (${statement.account.type})"`],
        [`"Statement Period: ${dateFrom || 'All Time'} to ${dateTo || 'Present'}"`],
        [`"Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}"`],
        [],
        headers.map(h => `"${h}"`).join(','),
      ];

      statement.rows.forEach((row: any) => {
        csvRows.push([
          `"${format(new Date(row.date), 'yyyy-MM-dd HH:mm')}"`,
          `"${row.referenceNumber || ''}"`,
          `"${row.entryType || ''}"`,
          `"${(row.description || '').replace(/"/g, '""')}"`,
          `"${row.debit || '0.000'}"`,
          `"${row.credit || '0.000'}"`,
          `"${row.runningBalance || '0.000'}"`,
          `"${(row.createdBy || '').replace(/"/g, '""')}"`,
          `"${(row.remarks || '').replace(/"/g, '""')}"`,
        ].join(','));
      });

      // Add summary row
      csvRows.push([]);
      csvRows.push([
        `"TOTALS"`, `""`, `""`, `""`,
        `"${statement.summary.totalDebit}"`,
        `"${statement.summary.totalCredit}"`,
        `"${statement.summary.closingBalance}"`,
        `""`, `""`
      ].join(','));

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csvRows.join('\n'));
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', csvContent);
      downloadLink.setAttribute('download', `Account_Ledger_${statement.account.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Failed to export statement:', err);
      alert('Failed to export ledger data.');
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(dateFrom || dateTo || entryTypeFilter !== 'ALL');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Account Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete transaction history, audit trail, and real-time running balance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint} className="shadow-sm">
            <Printer className="w-4 h-4 mr-2" /> Print Statement
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting} className="shadow-sm">
            <Download className="w-4 h-4 mr-2" /> {isExporting ? 'Exporting...' : 'Export Excel / CSV'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {currentAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Account Info</CardTitle>
              <Wallet className="w-4 h-4 text-primary opacity-80" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate text-foreground">{currentAccount.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs font-normal">
                  {currentAccount.type}
                </Badge>
                <span className="text-xs text-muted-foreground">KWD</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-emerald-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inflow (Credit)</CardTitle>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                +{currentTotals.credit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Page Credits</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-rose-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outflow (Debit)</CardTitle>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600">
                -{currentTotals.debit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Page Debits</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-sm bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Transactions</CardTitle>
              <Receipt className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totalEntries.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Recorded in database</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="border-border/60 shadow-sm print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-3">
            {/* Account Selector */}
            <div className="w-full md:w-64">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Account</label>
              <Select value={selectedAccountId} onValueChange={handleAccountChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <span className="font-medium">{a.name}</span> <span className="text-xs text-muted-foreground">({a.type})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entry Type */}
            <div className="w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Transaction Type</label>
              <Select value={entryTypeFilter} onValueChange={(v) => { setEntryTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="SALE_PAYMENT">Sale Payments</SelectItem>
                  <SelectItem value="PURCHASE_PAYMENT">Purchase Payments</SelectItem>
                  <SelectItem value="EXPENSE">Expenses</SelectItem>
                  <SelectItem value="OWNER_INVESTMENT">Owner Investments</SelectItem>
                  <SelectItem value="SALARY">Salaries</SelectItem>
                  <SelectItem value="TRANSFER_IN">Transfers In</SelectItem>
                  <SelectItem value="TRANSFER_OUT">Transfers Out</SelectItem>
                  <SelectItem value="OPENING_BALANCE">Opening Balance</SelectItem>
                  <SelectItem value="ADJUSTMENT">Adjustments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="w-full sm:w-40">
              <label className="text-xs font-medium text-muted-foreground block mb-1">From Date</label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} 
                  className="pr-2"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="w-full sm:w-40">
              <label className="text-xs font-medium text-muted-foreground block mb-1">To Date</label>
              <div className="relative">
                <Input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => { setDateTo(e.target.value); setPage(1); }} 
                  className="pr-2"
                />
              </div>
            </div>

            {/* Items Per Page */}
            <div className="w-full sm:w-32">
              <label className="text-xs font-medium text-muted-foreground block mb-1">Per Page</label>
              <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                  <SelectItem value="100">100 rows</SelectItem>
                  <SelectItem value="250">250 rows</SelectItem>
                  <SelectItem value="1000">All (1000)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={handleResetFilters} className="text-muted-foreground hover:text-foreground">
                  <FilterX className="w-4 h-4 mr-1" /> Reset
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table Content */}
      {isLoading ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : !ledger || !ledger.account ? (
        <Card><CardContent className="p-12 text-center text-muted-foreground">Please select a valid account</CardContent></Card>
      ) : (
        <Card className="shadow-sm print:shadow-none print:border-none overflow-hidden">
          <CardContent className="p-0">
            {/* Print Header */}
            <div className="hidden print:block p-8 border-b text-center">
              <h2 className="text-2xl font-bold">Account Statement</h2>
              <p className="text-lg mt-2">{ledger.account.name}</p>
              <p className="text-sm text-gray-500 mt-1">Generated on {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
              {(dateFrom || dateTo) && (
                <p className="text-xs text-gray-400 mt-1">
                  Period: {dateFrom || 'Start'} to {dateTo || 'End'}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[160px]">Date</TableHead>
                    <TableHead className="w-[140px]">Reference</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[130px]">Debit (-)</TableHead>
                    <TableHead className="text-right w-[130px]">Credit (+)</TableHead>
                    <TableHead className="text-right w-[150px] font-bold">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        No transactions found for the selected criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledger.entries.map((entry) => {
                      const badge = ENTRY_BADGES[entry.entryType] || { label: entry.entryType, color: 'bg-muted text-muted-foreground' };
                      const debit = Number(entry.debit);
                      const credit = Number(entry.credit);
                      const runningBal = Number(entry.runningBalance);

                      return (
                        <TableRow key={entry.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-medium">
                            {format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-foreground/80 font-medium">
                            {entry.referenceNumber || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`${badge.color} border text-[11px] font-semibold tracking-wide py-0.5`}>
                              {badge.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[340px] truncate" title={entry.description}>
                            <span className="text-sm font-medium text-foreground">{entry.description}</span>
                            {entry.remarks && (
                              <span className="block text-xs text-muted-foreground truncate">{entry.remarks}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-rose-600 font-semibold text-sm">
                            {debit > 0 ? (
                              <div className="flex items-center justify-end">
                                <ArrowDownLeft className="w-3.5 h-3.5 mr-1 opacity-70" />
                                {debit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-normal">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold text-sm">
                            {credit > 0 ? (
                              <div className="flex items-center justify-end">
                                <ArrowUpRight className="w-3.5 h-3.5 mr-1 opacity-70" />
                                {credit.toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40 font-normal">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-bold text-sm whitespace-nowrap ${runningBal < 0 ? 'text-rose-600 font-extrabold' : 'text-foreground'}`}>
                            {runningBal.toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/20 print:hidden">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{totalEntries === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, totalEntries)}</span> of{' '}
                <span className="font-semibold text-foreground">{totalEntries}</span> transactions
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(1)}
                    disabled={currentPage <= 1}
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <div key={p} className="flex items-center gap-1">
                            {showEllipsis && <span className="text-xs text-muted-foreground px-1">...</span>}
                            <Button
                              variant={p === currentPage ? 'default' : 'outline'}
                              size="sm"
                              className={`h-8 min-w-[32px] px-2 text-xs font-semibold ${
                                p === currentPage ? 'shadow-sm' : ''
                              }`}
                              onClick={() => setPage(p)}
                            >
                              {p}
                            </Button>
                          </div>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPage(totalPages)}
                    disabled={currentPage >= totalPages}
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
