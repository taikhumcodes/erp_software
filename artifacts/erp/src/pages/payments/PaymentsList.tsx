import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Download, Printer, Banknote, Trash } from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import { formatKWD } from '@/lib/utils';
import type { PaginatedResponse, PaymentListItem, PaymentStatistics, TransactionStatus } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { PaymentForm } from './PaymentForm';
import { PaymentDetails } from './PaymentDetails';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';

export function PaymentsList() {
  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'ALL'>('ALL');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/payments/${id}`),
    onSuccess: () => {
      setDeletePaymentId(null);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments-stats'] });
      refetch();
      toast({ title: t('success'), description: t('payment_deleted') || 'Payment deleted successfully' });
    },
    onError: (error: any) => {
      setDeletePaymentId(null);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error?.message || 'Failed to delete payment'
      });
    }
  });

  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['payments-stats'],
    queryFn: () => api.get<{ data: PaymentStatistics }>('/api/payments/statistics'),
    refetchInterval: 60000,
  });

  const { data: listResponse, isLoading: isLoadingList, refetch } = useQuery({
    queryKey: ['payments', { page, search: debouncedSearch, status: statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      
      return api.get<{ items: PaymentListItem[]; totalPages: number; totalCount: number; page: number; limit: number }>(`/api/payments?${params.toString()}`);
    },
  });

  const stats = statsResponse?.data;
  const list: PaymentListItem[] = listResponse?.items || [];
  const totalPages = listResponse?.totalPages || 1;

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('payments')}</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer receipts and supplier payments
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto shadow-md">
          <Plus className="mr-2 h-4 w-4" /> {t('payment_add')}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_stat_total')}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('payment_stat_pending')}</CardTitle>
            <div className="h-2 w-2 rounded-full bg-secondary" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-300">
              {t('payment_stat_customer_amount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-7 w-32" /> : (
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatKWD(stats?.totalCustomerAmount || '0')}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10 dark:border-red-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">
              {t('payment_stat_supplier_amount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? <Skeleton className="h-7 w-32" /> : (
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {formatKWD(stats?.totalSupplierAmount || '0')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('payment_search_placeholder')}
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select 
          value={statusFilter} 
          onValueChange={(val: any) => { setStatusFilter(val); setPage(1); }}
        >
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder={t('payment_status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('all_sale_statuses')}</SelectItem>
            <SelectItem value="PENDING">{t('payment_status_pending')}</SelectItem>
            <SelectItem value="COMPLETED">{t('payment_status_completed')}</SelectItem>
            <SelectItem value="CANCELLED">{t('payment_status_cancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="shadow-sm border-t-4 border-t-primary/20">
        <div className="rounded-md border-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">{t('payment_number')}</TableHead>
                <TableHead className="font-semibold">{t('payment_date')}</TableHead>
                <TableHead className="font-semibold">{t('payment_party')}</TableHead>
                <TableHead className="font-semibold">{t('payment_type')}</TableHead>
                <TableHead className="text-right font-semibold">{t('payment_amount')}</TableHead>
                <TableHead className="text-right font-semibold">{t('payment_remaining')}</TableHead>
                <TableHead className="font-semibold">{t('payment_status')}</TableHead>
                <TableHead className="text-right font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingList ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Banknote className="h-10 w-10 mb-2 opacity-20" />
                      <p>{t('payment_no_results')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                list.map((payment) => {
                  const isCustomer = payment.type === 'CUSTOMER';
                  const partyName = isCustomer ? payment.customer?.name : payment.supplier?.name;
                  
                  return (
                    <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-medium">{payment.number}</TableCell>
                      <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {partyName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={isCustomer ? "text-green-600 border-green-200 bg-green-50 dark:bg-transparent" : "text-red-600 border-red-200 bg-red-50 dark:bg-transparent"}>
                          {t(`payment_type_${payment.type.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatKWD(payment.amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-orange-600">
                        {formatKWD(payment.remainingAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'COMPLETED' ? 'default' : payment.status === 'PENDING' ? 'secondary' : 'destructive'}>
                          {t(`payment_status_${payment.status.toLowerCase()}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedPaymentId(payment.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {payment.status === 'CANCELLED' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDeletePaymentId(payment.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t bg-muted/20">
            <div className="text-sm text-muted-foreground">
              {t('showing_results', {
                from: (page - 1) * 20 + 1,
                to: Math.min(page * 20, listResponse?.totalCount || 0),
                total: listResponse?.totalCount || 0
              })}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1 || isLoadingList}
              >
                {t('previous')}
              </Button>
              <div className="flex items-center justify-center px-4 text-sm font-medium">
                {t('page_of', { page, pages: totalPages })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || isLoadingList}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <PaymentForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        onSuccess={() => refetch()} 
      />

      {selectedPaymentId && (
        <PaymentDetails
          paymentId={selectedPaymentId}
          onClose={() => {
            setSelectedPaymentId(null);
            refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletePaymentId}
        title={t('delete_payment_title')}
        description={t('delete_payment_confirm')}
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => deletePaymentId && deleteMutation.mutate(deletePaymentId)}
        onCancel={() => setDeletePaymentId(null)}
      />
    </div>
  );
}
