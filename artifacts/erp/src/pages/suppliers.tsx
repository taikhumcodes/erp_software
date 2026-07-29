import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2,
  Users, CheckCircle, XCircle, Banknote,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { formatKWD } from '@/lib/utils';
import type { Supplier, SupplierStatistics, PaginatedResponse } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupplierForm {
  name: string;
  nameAr: string;
  phone: string;
  email: string;
  address: string;
  balance: string;
  isActive: boolean;
}

type FieldErrors = Partial<Record<keyof SupplierForm, string>>;

const emptyForm = (): SupplierForm => ({
  name: '', nameAr: '', phone: '', email: '',
  address: '', balance: '0.000', isActive: true,
});

function formatKuwaitMobile(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
  const normalized = local.slice(0, 8);
  if (!normalized) return '';
  return `+965 ${normalized.slice(0, 4)}${normalized.length > 4 ? ` ${normalized.slice(4)}` : ''}`;
}

function getKuwaitMobileError(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
  if (!local) return 'Kuwait mobile number is required';
  if (!/^[569]\d{7}$/.test(local)) {
    return 'Enter a valid Kuwait mobile number starting with 5, 6, or 9';
  }
  return null;
}

function supplierToForm(s: Supplier): SupplierForm {
  return {
    name:     s.name,
    nameAr:   s.nameAr   ?? '',
    phone:    s.phone ? formatKuwaitMobile(s.phone) : '',
    email:    s.email    ?? '',
    address:  s.address  ?? '',
    balance:  s.balance,
    isActive: s.isActive,
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchSuppliers = (qs: string) =>
  api.get<PaginatedResponse<Supplier>>(`/api/suppliers?${qs}`);

const fetchStats = () =>
  api.get<{ data: SupplierStatistics }>('/api/suppliers/statistics');

const createSupplier = (body: Partial<SupplierForm>) =>
  api.post<{ data: Supplier }>('/api/suppliers', body);

const updateSupplier = (id: string, body: Partial<SupplierForm>) =>
  api.put<{ data: Supplier }>(`/api/suppliers/${id}`, body);

const deleteSupplier = (id: string) =>
  api.del(`/api/suppliers/${id}`);

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading
          ? <Skeleton className="h-8 w-24" />
          : <div className="text-2xl font-bold">{value}</div>
        }
      </CardContent>
    </Card>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function SupplierDialog({
  open, onOpenChange, supplier, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: Supplier | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!supplier;

  const [form, setForm]     = useState<SupplierForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  const { handleArabicChange, resetTranslationState } = useAutoTranslate(
    form.name,
    form.nameAr,
    (text) => setForm((prev) => ({ ...prev, nameAr: text }))
  );

  useEffect(() => {
    if (!open) return;
    resetTranslationState();
    setForm(supplier ? supplierToForm(supplier) : emptyForm());
    setErrors({});
  }, [open, supplier]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  const field =
    (key: keyof SupplierForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  // Map API field-error array back to a FieldErrors object
  const applyFieldErrors = (
    raw: { field: string; message: string }[] | undefined,
  ) => {
    if (!raw?.length) return false;
    const fe: FieldErrors = {};
    raw.forEach(({ field: f, message: m }) => { fe[f as keyof SupplierForm] = m; });
    setErrors(fe);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      toast({ title: t('supplier_created') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error & { errors?: { field: string; message: string }[] }) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Partial<SupplierForm>) => updateSupplier(supplier!.id, body),
    onSuccess: () => {
      toast({ title: t('supplier_updated') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error & { errors?: { field: string; message: string }[] }) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const phoneError = getKuwaitMobileError(form.phone);
    if (phoneError) {
      setErrors({ phone: phoneError });
      return;
    }
    const body: Partial<SupplierForm> = {
      name:     form.name,
      nameAr:   form.nameAr   || undefined,
      phone:    formatKuwaitMobile(form.phone),
      email:    form.email    || undefined,
      address:  form.address  || undefined,
      balance:  form.balance,
      isActive: form.isActive,
    };
    isEdit ? updateMutation.mutate(body) : createMutation.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('edit_supplier') : t('add_supplier')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('supplier_edit_desc') : t('supplier_add_desc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* English name */}
          <div className="space-y-1">
            <Label htmlFor="s-name">
              {t('supplier_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="s-name"
              value={form.name}
              onChange={field('name')}
              placeholder={t('supplier_name_placeholder')}
              disabled={isPending}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Arabic name */}
          <div className="space-y-1">
            <Label htmlFor="s-name-ar">{t('supplier_name_ar')}</Label>
            <Input
              id="s-name-ar"
              dir="rtl"
              value={form.nameAr}
              onChange={(e) => handleArabicChange(e.target.value)}
              placeholder={t('supplier_name_ar_placeholder')}
              disabled={isPending}
            />
            {errors.nameAr && <p className="text-sm text-destructive">{errors.nameAr}</p>}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-phone">
                {t('supplier_phone')}
              </Label>
              <Input
                id="s-phone"
                value={form.phone}
                onChange={e => {
                  setForm(prev => ({ ...prev, phone: formatKuwaitMobile(e.target.value) }));
                  setErrors(prev => ({ ...prev, phone: undefined }));
                }}
                placeholder="+965 XXXX XXXX"
                disabled={isPending}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-email">{t('supplier_email')}</Label>
              <Input
                id="s-email"
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder="supplier@example.com"
                disabled={isPending}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <Label htmlFor="s-address">{t('supplier_address')}</Label>
            <Input
              id="s-address"
              value={form.address}
              onChange={field('address')}
              placeholder={t('supplier_address_placeholder')}
              disabled={isPending}
            />
            {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
          </div>

          {/* Balance + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="s-balance">{t('supplier_opening_balance')}</Label>
              <Input
                id="s-balance"
                type="number"
                min="0"
                step="0.001"
                value={form.balance}
                onChange={field('balance')}
                onFocus={e => e.target.select()}
                disabled={isPending || isEdit}
              />
              {errors.balance && <p className="text-sm text-destructive">{errors.balance}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="s-status">{t('status')}</Label>
              <Select
                value={form.isActive ? 'true' : 'false'}
                onValueChange={v => setForm(prev => ({ ...prev, isActive: v === 'true' }))}
                disabled={isPending}
              >
                <SelectTrigger id="s-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('active')}</SelectItem>
                  <SelectItem value="false">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? t('saving')
                : isEdit ? t('save_changes') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Suppliers page ───────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & pagination
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState<'all' | 'true' | 'false'>('all');
  const [sortBy,         setSortBy]         = useState('createdAt');
  const [page,           setPage]           = useState(1);
  const LIMIT = 20;

  const debouncedSearch = useDebounce(search, 400);

  // Dialog state
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<Supplier | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Supplier | null>(null);

  // ── Build query string ──────────────────────────────────────────────────────
  const qs = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'all' && { isActive: statusFilter }),
    sortBy,
    sortOrder: 'desc',
    page:  String(page),
    limit: String(LIMIT),
  }).toString();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const suppliersQuery = useQuery({
    queryKey: ['suppliers', debouncedSearch, statusFilter, sortBy, page],
    queryFn:  () => fetchSuppliers(qs),
  });

  const statsQuery = useQuery({
    queryKey: ['suppliers-statistics'],
    queryFn:  fetchStats,
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteSupplier(deleteTarget!.id),
    onSuccess: () => {
      toast({ title: t('supplier_deleted') });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      void queryClient.invalidateQueries({ queryKey: ['suppliers-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    void queryClient.invalidateQueries({ queryKey: ['suppliers-statistics'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = suppliersQuery.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('suppliers')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add_supplier')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('supplier_stat_total')}
          value={stats?.total ?? 0}
          icon={<Users className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('supplier_stat_active')}
          value={stats?.active ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('supplier_stat_inactive')}
          value={stats?.inactive ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('supplier_stat_balance')}
          value={stats ? formatKWD(stats.totalBalance) : '—'}
          icon={<Banknote className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t('supplier_search_placeholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={v => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_statuses')}</SelectItem>
            <SelectItem value="true">{t('active')}</SelectItem>
            <SelectItem value="false">{t('inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={v => { setSortBy(v); setPage(1); }}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t('sort_date_added')}</SelectItem>
            <SelectItem value="name">{t('sort_name')}</SelectItem>
            <SelectItem value="code">{t('sort_code')}</SelectItem>
            <SelectItem value="balance">{t('sort_balance')}</SelectItem>
            <SelectItem value="isActive">{t('status')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('supplier_code')}</TableHead>
                <TableHead>{t('supplier_name')}</TableHead>
                <TableHead>{t('supplier_name_ar')}</TableHead>
                <TableHead>{t('supplier_phone')}</TableHead>
                <TableHead>{t('supplier_email')}</TableHead>
                <TableHead className="text-end">{t('supplier_balance')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliersQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : suppliersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-destructive">
                    {t('no_records')}
                  </TableCell>
                </TableRow>
              ) : !list?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    {debouncedSearch ? t('supplier_no_results') : t('supplier_empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map(supplier => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell dir="rtl" className="text-right font-medium">
                      {supplier.nameAr ?? '—'}
                    </TableCell>
                    <TableCell>{supplier.phone ?? '—'}</TableCell>
                    <TableCell>{supplier.email ?? '—'}</TableCell>
                    <TableCell className="text-end font-mono">
                      {formatKWD(supplier.balance)}
                    </TableCell>
                    <TableCell>
                      {supplier.isActive ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          {t('active')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive text-destructive">
                          {t('inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditTarget(supplier)}
                          title={t('edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(supplier)}
                          title={t('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {list && list.meta.pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {t('showing_results', {
                from:  (list.meta.page - 1) * list.meta.limit + 1,
                to:    Math.min(list.meta.page * list.meta.limit, list.meta.total),
                total: list.meta.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                {t('previous')}
              </Button>
              <span className="text-sm">
                {t('page_of', { page, pages: list.meta.pages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(list.meta.pages, p + 1))}
                disabled={page === list.meta.pages}
              >
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create dialog */}
      <SupplierDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      {/* Edit dialog */}
      <SupplierDialog
        open={!!editTarget}
        onOpenChange={open => !open && setEditTarget(null)}
        supplier={editTarget}
        onSuccess={invalidate}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('delete_supplier_confirm')}
        description={t('supplier_delete_desc')}
        confirmLabel={t('delete')}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
