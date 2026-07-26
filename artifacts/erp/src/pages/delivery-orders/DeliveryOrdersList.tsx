import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Eye, Truck, CheckCircle, XCircle, FileText, Check, MoreHorizontal } from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import type { DeliveryOrderListItem, DeliveryOrderStatistics, PaginatedResponse } from '@/lib/types';
import type { DeliveryOrderStatus } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_COLORS: Record<DeliveryOrderStatus, string> = {
  DRAFT: 'border-yellow-500 text-yellow-600',
  APPROVED: 'border-blue-500 text-blue-600',
  DISPATCHED: 'border-orange-500 text-orange-600',
  DELIVERED: 'border-green-500 text-green-600',
  CANCELLED: 'border-destructive text-destructive',
};

const fetchDeliveryOrders = (qs: string) => api.get<PaginatedResponse<DeliveryOrderListItem>>(`/api/delivery-orders?${qs}`);
const fetchStats = () => api.get<{ data: DeliveryOrderStatistics }>('/api/delivery-orders/statistics');
const deleteDeliveryOrder = (id: string) => api.del(`/api/delivery-orders/${id}`);

function StatCard({ title, value, icon, loading }: { title: string; value: string | number; icon: React.ReactNode; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );
}

export function DeliveryOrdersList({
  onAdd,
  onEdit,
  onView,
}: {
  onAdd: () => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const debouncedSearch = useDebounce(search, 500);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: String(limit), sortBy: 'createdAt', sortOrder: 'desc' });
    if (debouncedSearch) p.set('search', debouncedSearch);
    if (status && status !== 'ALL') p.set('status', status);
    return p.toString();
  }, [page, limit, debouncedSearch, status]);

  const listQuery = useQuery({
    queryKey: ['delivery-orders', queryParams],
    queryFn: () => fetchDeliveryOrders(queryParams),
  });

  const statsQuery = useQuery({
    queryKey: ['delivery-orders-stats'],
    queryFn: fetchStats,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDeliveryOrder,
    onSuccess: () => {
      toast({ title: t('do_deleted') });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders-stats'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleDelete = useCallback((id: string) => { setDeleteConfirm(id); }, []);
  const confirmDelete = useCallback(() => {
    if (deleteConfirm) { deleteMutation.mutate(deleteConfirm); setDeleteConfirm(null); }
  }, [deleteConfirm, deleteMutation]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value); setPage(1); };
  const handleStatusChange = (val: string) => { setStatus(val); setPage(1); };
  const handleLimitChange = (val: string) => { setLimit(Number(val)); setPage(1); };

  const data = listQuery.data?.data || [];
  const meta = listQuery.data?.meta;
  const stats = statsQuery.data?.data;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <StatCard title={t('do_stat_total')} value={stats?.total || 0} icon={<FileText className="h-4 w-4" />} loading={statsQuery.isLoading} />
        <StatCard title={t('do_stat_draft')} value={stats?.draft || 0} icon={<FileText className="h-4 w-4 text-yellow-500" />} loading={statsQuery.isLoading} />
        <StatCard title={t('do_stat_approved')} value={stats?.approved || 0} icon={<Check className="h-4 w-4 text-blue-500" />} loading={statsQuery.isLoading} />
        <StatCard title={t('do_stat_dispatched')} value={stats?.dispatched || 0} icon={<Truck className="h-4 w-4 text-orange-500" />} loading={statsQuery.isLoading} />
        <StatCard title={t('do_stat_delivered')} value={stats?.delivered || 0} icon={<CheckCircle className="h-4 w-4 text-green-500" />} loading={statsQuery.isLoading} />
        <StatCard title={t('do_stat_cancelled')} value={stats?.cancelled || 0} icon={<XCircle className="h-4 w-4 text-destructive" />} loading={statsQuery.isLoading} />
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder={t('do_search_placeholder')} className="pl-8" value={search} onChange={handleSearchChange} />
          </div>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('do_status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('all_do_statuses')}</SelectItem>
              <SelectItem value="DRAFT">{t('do_stat_draft')}</SelectItem>
              <SelectItem value="APPROVED">{t('do_stat_approved')}</SelectItem>
              <SelectItem value="DISPATCHED">{t('do_stat_dispatched')}</SelectItem>
              <SelectItem value="DELIVERED">{t('do_stat_delivered')}</SelectItem>
              <SelectItem value="CANCELLED">{t('do_stat_cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onAdd}>
          <Plus className="mr-2 h-4 w-4" />
          {t('do_add')}
        </Button>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('do_number')}</TableHead>
              <TableHead>{t('do_customer')}</TableHead>
              <TableHead>{t('do_sales_order')}</TableHead>
              <TableHead>{t('do_status')}</TableHead>
              <TableHead>{t('do_delivery_date')}</TableHead>
              <TableHead className="text-end">{'Actions'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search ? t('do_no_results') : t('do_empty')}
                </TableCell>
              </TableRow>
            ) : (
              data.map((order: DeliveryOrderListItem) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">{order.number}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.customer.name}</div>
                    {order.customer.code && <div className="text-xs text-muted-foreground">{order.customer.code}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="font-mono">{order.internalSONumber}</div>
                    {order.customerPONumber && (
                      <div className="text-xs text-muted-foreground">{t('do_customer_po')}: {order.customerPONumber}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_COLORS[order.status as DeliveryOrderStatus]}>
                      {t(`do_stat_${order.status.toLowerCase()}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(order.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t('do_view')}
                        </DropdownMenuItem>
                        {order.status === 'DRAFT' && (
                          <DropdownMenuItem onClick={() => onEdit(order.id)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t('do_edit')}
                          </DropdownMenuItem>
                        )}
                        {order.status === 'DRAFT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-destructive-foreground" onClick={() => handleDelete(order.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-muted-foreground">Rows per page</p>
            <Select value={String(limit)} onValueChange={handleLimitChange}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={String(limit)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || listQuery.isLoading}>
              Previous
            </Button>
            <div className="text-sm font-medium">Page {page} of {meta.pages}</div>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages || listQuery.isLoading}>
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => !v && setDeleteConfirm(null)}
        title={t('delete_do_confirm')}
        description={t('do_delete_desc')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
