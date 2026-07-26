import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, Eye,
  ShoppingCart, FileText, CheckCircle, PackageCheck, XCircle, Banknote,
  X, MoreHorizontal, Printer, Download,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import { formatKWD } from '@/lib/utils';
import type {
  Purchase, PurchaseListItem, PurchaseStatistics,
  PaginatedResponse, Supplier, Product, PurchaseStatus,
} from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseItemForm {
  key: string;        // local key for React rendering
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface PurchaseForm {
  supplierId: string;
  purchaseDate: string;
  status: 'DRAFT' | 'CONFIRMED';
  discount: string;
  notes: string;
  paymentMethod: string;
  items: PurchaseItemForm[];
}

type FieldErrors = Record<string, string>;

let _itemKey = 0;
const nextKey = () => `item-${++_itemKey}`;

const emptyItem = (): PurchaseItemForm => ({
  key: nextKey(),
  productId: '',
  quantity: '1',
  unitPrice: '0.000',
});

const emptyForm = (): PurchaseForm => ({
  supplierId: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  status: 'DRAFT',
  discount: '0.000',
  notes: '',
  paymentMethod: '',
  items: [emptyItem()],
});

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<PurchaseStatus, string> = {
  DRAFT:     'border-yellow-500 text-yellow-600',
  CONFIRMED: 'border-blue-500 text-blue-600',
  RECEIVED:  'border-green-500 text-green-600',
  CANCELLED: 'border-destructive text-destructive',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  UNPAID: 'border-destructive text-destructive bg-destructive/10',
  PARTIALLY_PAID: 'border-orange-500 text-orange-600 bg-orange-100 dark:bg-orange-900/20',
  PAID: 'border-green-500 text-green-600 bg-green-100 dark:bg-green-900/20',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchPurchases = (qs: string) =>
  api.get<PaginatedResponse<PurchaseListItem>>(`/api/purchases?${qs}`);

const fetchPurchase = (id: string) =>
  api.get<{ data: Purchase }>(`/api/purchases/${id}`);

const fetchStats = () =>
  api.get<{ data: PurchaseStatistics }>('/api/purchases/statistics');

const fetchSuppliers = () =>
  api.get<PaginatedResponse<Supplier>>('/api/suppliers?limit=200&isActive=true');

const fetchProducts = () =>
  api.get<PaginatedResponse<Product>>('/api/products?limit=500&isActive=true');

const createPurchase = (body: Record<string, unknown>) =>
  api.post<{ data: Purchase }>('/api/purchases', body);

const updatePurchase = (id: string, body: Record<string, unknown>) =>
  api.put<{ data: Purchase }>(`/api/purchases/${id}`, body);

const updatePurchaseStatus = (id: string, body: { status: string }) =>
  api.patch<{ data: Purchase }>(`/api/purchases/${id}/status`, body);

const deletePurchase = (id: string) =>
  api.del(`/api/purchases/${id}`);

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

// ─── View dialog ──────────────────────────────────────────────────────────────

function PurchaseViewDialog({
  open, onOpenChange, purchaseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  purchaseId: string | null;
}) {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => fetchPurchase(purchaseId!),
    enabled: !!purchaseId && open,
  });

  const purchase = query.data?.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_purchase')}</DialogTitle>
          <DialogDescription>{t('purchase_view_desc')}</DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : purchase ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t('purchase_number')}</span>
                <p className="font-mono font-bold">{purchase.number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('operational_status')}</span>
                <p>
                  <Badge variant="outline" className={STATUS_COLORS[purchase.status]}>
                    {t(`status_${purchase.status.toLowerCase()}`)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('financial_status')}</span>
                <p>
                  <Badge variant="outline" className={PAYMENT_STATUS_COLORS[purchase.paymentStatus]}>
                    {t(`payment_status_${purchase.paymentStatus.toLowerCase()}`)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('purchase_supplier')}</span>
                <p className="font-medium">{purchase.supplier.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('purchase_date')}</span>
                <p>{new Date(purchase.purchaseDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('purchase_created_by')}</span>
                <p>{purchase.user.name}</p>
              </div>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-medium mb-2">{t('purchase_items')}</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('purchase_item_product')}</TableHead>
                      <TableHead>{t('purchase_item_unit')}</TableHead>
                      <TableHead className="text-end">{t('purchase_item_quantity')}</TableHead>
                      <TableHead className="text-end">{t('purchase_item_unit_price')}</TableHead>
                      <TableHead className="text-end">{t('purchase_item_total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.product.name}</span>
                            <span className="block text-xs text-muted-foreground font-mono">{item.product.sku}</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.product.unit.abbreviation}</TableCell>
                        <TableCell className="text-end font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-end font-mono">{formatKWD(item.unitPrice)}</TableCell>
                        <TableCell className="text-end font-mono">{formatKWD(item.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('purchase_subtotal')}</span>
                <span className="font-mono">{formatKWD(purchase.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('purchase_discount')}</span>
                <span className="font-mono">-{formatKWD(purchase.discount)}</span>
              </div>

              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>{t('purchase_grand_total')}</span>
                <span className="font-mono">{formatKWD(purchase.netAmount)}</span>
              </div>
            </div>

            {/* Notes */}
            {purchase.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('purchase_notes')}</span>
                <p className="mt-1">{purchase.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function PurchaseFormDialog({
  open, onOpenChange, purchaseId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  purchaseId?: string | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!purchaseId;

  const [form, setForm]     = useState<PurchaseForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});

  // Fetch reference data
  const suppliersQuery = useQuery({
    queryKey: ['suppliers-list-for-purchase'],
    queryFn:  fetchSuppliers,
    enabled:  open,
  });

  const productsQuery = useQuery({
    queryKey: ['products-list-for-purchase'],
    queryFn:  fetchProducts,
    enabled:  open,
  });

  // Fetch existing purchase for edit
  const purchaseQuery = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn:  () => fetchPurchase(purchaseId!),
    enabled:  isEdit && open,
  });

  // Populate form on edit
  useEffect(() => {
    if (!open) return;
    if (isEdit && purchaseQuery.data) {
      const p = purchaseQuery.data.data;
      setForm({
        supplierId: p.supplierId,
        purchaseDate: p.purchaseDate.slice(0, 10),
        status: p.status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED',
        discount: p.discount,
        notes: p.notes ?? '',
        paymentMethod: p.paymentMethod ?? '',
        items: p.items.map(item => ({
          key: nextKey(),
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    } else if (!isEdit) {
      setForm(emptyForm());
    }
    setErrors({});
  }, [open, isEdit, purchaseQuery.data]);

  const suppliers = suppliersQuery.data?.data ?? [];
  const products  = productsQuery.data?.data ?? [];

  // Product lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  // ── Item helpers ──────────────────────────────────────────────────────────

  const updateItem = (key: string, field: keyof PurchaseItemForm, value: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it =>
        it.key === key ? { ...it, [field]: value } : it
      ),
    }));
  };

  const removeItem = (key: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter(it => it.key !== key),
    }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  // When selecting a product, auto-fill the cost price
  const handleProductSelect = (key: string, productId: string) => {
    const prod = productMap.get(productId);
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it =>
        it.key === key
          ? { ...it, productId, unitPrice: prod?.costPrice ?? '0.000' }
          : it
      ),
    }));
  };

  // ── Subtotal calculation ──────────────────────────────────────────────────

  const subtotal = useMemo(() => {
    return form.items.reduce((sum, it) => {
      return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    }, 0);
  }, [form.items]);

  const grandTotal = useMemo(() => {
    return subtotal - (Number(form.discount) || 0);
  }, [subtotal, form.discount]);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const applyFieldErrors = (
    raw: { field: string; message: string }[] | undefined,
  ) => {
    if (!raw?.length) return false;
    const fe: FieldErrors = {};
    raw.forEach(({ field: f, message: m }) => { fe[f] = m; });
    setErrors(fe);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      toast({ title: t('purchase_created') });
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
    mutationFn: (body: Record<string, unknown>) => updatePurchase(purchaseId!, body),
    onSuccess: () => {
      toast({ title: t('purchase_updated') });
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

    // Basic client-side validation
    const fe: FieldErrors = {};
    if (!form.supplierId) fe.supplierId = 'Supplier is required';
    if (!form.items.length || form.items.every(it => !it.productId)) {
      fe.items = t('purchase_no_items');
    }
    if (Object.keys(fe).length) { setErrors(fe); return; }

    const body: Record<string, unknown> = {
      supplierId:   form.supplierId,
      purchaseDate: form.purchaseDate,
      status:       form.status,
      discount:     form.discount,
      notes:        form.notes || undefined,
      paymentMethod: form.paymentMethod || undefined,
      items:        form.items
        .filter(it => it.productId)
        .map(it => ({
          productId: it.productId,
          quantity:  it.quantity,
          unitPrice: it.unitPrice,
        })),
    };

    isEdit ? updateMutation.mutate(body) : createMutation.mutate(body);
  };

  const isDataLoading = suppliersQuery.isLoading || productsQuery.isLoading || (isEdit && purchaseQuery.isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('edit_purchase') : t('add_purchase')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('purchase_edit_desc') : t('purchase_add_desc')}
          </DialogDescription>
        </DialogHeader>

        {isDataLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier + Date + Status + Payment Method row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-supplier">
                  {t('purchase_supplier')} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.supplierId}
                  onValueChange={v => setForm(prev => ({ ...prev, supplierId: v }))}
                  disabled={isPending}
                >
                  <SelectTrigger id="p-supplier"><SelectValue placeholder={t('purchase_select_supplier')} /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supplierId && <p className="text-sm text-destructive">{errors.supplierId}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-date">{t('purchase_date')}</Label>
                <Input
                  id="p-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={e => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status">{t('purchase_status')}</Label>
                <Select
                  value={form.status}
                  onValueChange={v => setForm(prev => ({ ...prev, status: v as 'DRAFT' | 'CONFIRMED' }))}
                  disabled={isPending}
                >
                  <SelectTrigger id="p-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{t('status_draft')}</SelectItem>
                    <SelectItem value="CONFIRMED">{t('status_confirmed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('purchase_items')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isPending}>
                  <Plus className="h-3 w-3 me-1" /> {t('purchase_add_item')}
                </Button>
              </div>

              {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t('purchase_item_product')}</TableHead>
                      <TableHead className="w-[15%]">{t('purchase_item_quantity')}</TableHead>
                      <TableHead className="w-[20%]">{t('purchase_item_unit_price')}</TableHead>
                      <TableHead className="w-[15%] text-end">{t('purchase_item_total')}</TableHead>
                      <TableHead className="w-[10%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map(item => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <TableRow key={item.key}>
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={v => handleProductSelect(item.key, v)}
                              disabled={isPending}
                            >
                              <SelectTrigger><SelectValue placeholder={t('purchase_select_product')} /></SelectTrigger>
                              <SelectContent>
                                {products.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={e => updateItem(item.key, 'quantity', e.target.value)}
                              onFocus={e => e.target.select()}
                              disabled={isPending}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={item.unitPrice}
                              onChange={e => updateItem(item.key, 'unitPrice', e.target.value)}
                              onFocus={e => e.target.select()}
                              disabled={isPending}
                            />
                          </TableCell>
                          <TableCell className="text-end font-mono text-sm">
                            {formatKWD(lineTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive h-8 w-8"
                              onClick={() => removeItem(item.key)}
                              disabled={isPending || form.items.length <= 1}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Discount, Notes */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-discount">{t('purchase_discount')}</Label>
                <Input
                  id="p-discount"
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.discount}
                  onChange={e => setForm(prev => ({ ...prev, discount: e.target.value }))}
                  onFocus={e => e.target.select()}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <div className="text-sm text-muted-foreground">{t('purchase_grand_total')}</div>
                <div className="text-xl font-bold font-mono">{formatKWD(grandTotal)}</div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="p-notes">{t('purchase_notes')}</Label>
              <Textarea
                id="p-notes"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                disabled={isPending}
              />
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
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Purchases page ───────────────────────────────────────────────────────────

export default function PurchasesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters & pagination
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseStatus>('all');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [page,         setPage]         = useState(1);
  const LIMIT = 20;

  const debouncedSearch = useDebounce(search, 400);

  // Dialog state
  const [createOpen,      setCreateOpen]      = useState(false);
  const [editTargetId,    setEditTargetId]    = useState<string | null>(null);
  const [viewTargetId,    setViewTargetId]    = useState<string | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<PurchaseListItem | null>(null);
  const [statusTarget,    setStatusTarget]    = useState<{ id: string; newStatus: PurchaseStatus } | null>(null);

  // ── Build query string ──────────────────────────────────────────────────────
  const qs = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    sortBy,
    sortOrder: 'desc',
    page:  String(page),
    limit: String(LIMIT),
  }).toString();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const purchasesQuery = useQuery({
    queryKey: ['purchases', debouncedSearch, statusFilter, sortBy, page],
    queryFn:  () => fetchPurchases(qs),
  });

  const statsQuery = useQuery({
    queryKey: ['purchases-statistics'],
    queryFn:  fetchStats,
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deletePurchase(deleteTarget!.id),
    onSuccess: () => {
      toast({ title: t('purchase_deleted') });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['purchases-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  // ── Status mutation ─────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: () => updatePurchaseStatus(statusTarget!.id, { status: statusTarget!.newStatus }),
    onSuccess: () => {
      toast({ title: t('purchase_status_updated') });
      setStatusTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['purchases'] });
      void queryClient.invalidateQueries({ queryKey: ['purchases-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setStatusTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['purchases'] });
    void queryClient.invalidateQueries({ queryKey: ['purchases-statistics'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = purchasesQuery.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('purchases')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add_purchase')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={t('purchase_stat_total')}
          value={stats?.total ?? 0}
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('purchase_stat_draft')}
          value={stats?.draft ?? 0}
          icon={<FileText className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('purchase_stat_confirmed')}
          value={stats?.confirmed ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('purchase_stat_received')}
          value={stats?.received ?? 0}
          icon={<PackageCheck className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('purchase_stat_cancelled')}
          value={stats?.cancelled ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('purchase_stat_amount')}
          value={stats ? formatKWD(stats.totalAmount) : '—'}
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
            placeholder={t('purchase_search_placeholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={v => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_purchase_statuses')}</SelectItem>
            <SelectItem value="DRAFT">{t('status_draft')}</SelectItem>
            <SelectItem value="CONFIRMED">{t('status_confirmed')}</SelectItem>
            <SelectItem value="RECEIVED">{t('status_received')}</SelectItem>
            <SelectItem value="CANCELLED">{t('status_cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={v => { setSortBy(v); setPage(1); }}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t('sort_purchase_date')}</SelectItem>
            <SelectItem value="number">{t('sort_purchase_number')}</SelectItem>
            <SelectItem value="totalAmount">{t('sort_total')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchase_number')}</TableHead>
                <TableHead>{t('purchase_supplier')}</TableHead>
                <TableHead>{t('purchase_date')}</TableHead>
                <TableHead>{t('purchase_items')}</TableHead>
                <TableHead className="text-end">{t('purchase_grand_total')}</TableHead>
                <TableHead className="text-end">{t('paid_amount')}</TableHead>
                <TableHead className="text-end">{t('outstanding_amount')}</TableHead>
                <TableHead>{t('operational_status')}</TableHead>
                <TableHead>{t('financial_status')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchasesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : purchasesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-destructive">
                    {t('no_records')}
                  </TableCell>
                </TableRow>
              ) : !list?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                    {debouncedSearch ? t('purchase_no_results') : t('purchase_empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map(purchase => (
                  <TableRow key={purchase.id}>
                    <TableCell className="font-mono text-sm font-medium">{purchase.number}</TableCell>
                    <TableCell>{purchase.supplier.name}</TableCell>
                    <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t('purchase_items_count', { count: purchase.itemCount })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatKWD(purchase.netAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-green-600">
                      {formatKWD(purchase.paidAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-destructive">
                      {formatKWD(purchase.outstandingAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[purchase.status]}>
                        {t(`status_${purchase.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PAYMENT_STATUS_COLORS[purchase.paymentStatus]}>
                        {t(`payment_status_${purchase.paymentStatus.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewTargetId(purchase.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('view_purchase')}
                            </DropdownMenuItem>

                            {purchase.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: purchase.id, newStatus: 'CONFIRMED' })}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t('confirm_purchase')}
                              </DropdownMenuItem>
                            )}
                            
                            {purchase.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: purchase.id, newStatus: 'RECEIVED' })}>
                                <PackageCheck className="mr-2 h-4 w-4" />
                                {t('receive_purchase')}
                              </DropdownMenuItem>
                            )}

                            {purchase.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => setEditTargetId(purchase.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => {
                              window.open(`/documents/purchase-order/${purchase.id}`, '_blank');
                            }}>
                              <FileText className="mr-2 h-4 w-4" />
                              {t('purchase_export_pdf')}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              toast({ title: t('purchase_export_xls'), description: t('coming_soon') });
                            }}>
                              <Download className="mr-2 h-4 w-4" />
                              {t('purchase_export_xls')}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              window.open(`/documents/purchase-order/${purchase.id}?print=true`, '_blank');
                            }}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t('print')}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {purchase.status !== 'CANCELLED' && (
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setStatusTarget({ id: purchase.id, newStatus: 'CANCELLED' })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('cancel_purchase')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setDeleteTarget(purchase)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      <PurchaseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      {/* Edit dialog */}
      <PurchaseFormDialog
        open={!!editTargetId}
        onOpenChange={open => !open && setEditTargetId(null)}
        purchaseId={editTargetId}
        onSuccess={invalidate}
      />

      {/* View dialog */}
      <PurchaseViewDialog
        open={!!viewTargetId}
        onOpenChange={open => !open && setViewTargetId(null)}
        purchaseId={viewTargetId}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('delete_purchase_confirm')}
        description={t('purchase_delete_desc')}
        confirmLabel={t('delete')}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      {/* Status change confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        title={t('purchase_confirm_status')}
        description={t('purchase_confirm_status_desc')}
        confirmLabel={statusTarget ? t(`status_${statusTarget.newStatus.toLowerCase()}`) : ''}
        onConfirm={() => statusMutation.mutate()}
        onCancel={() => setStatusTarget(null)}
        loading={statusMutation.isPending}
      />
    </div>
  );
}
