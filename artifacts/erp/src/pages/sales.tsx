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
  Sale, SaleListItem, SaleStatistics,
  PaginatedResponse, Customer, Product, SaleStatus,
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

interface SaleItemForm {
  key: string;        // local key for React rendering
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface SaleForm {
  deliveryOrderId: string;
  customerId: string;
  saleDate: string;
  status: 'DRAFT' | 'CONFIRMED';
  discount: string;
  notes: string;
  paymentMethod: string;
  items: SaleItemForm[];
}

type FieldErrors = Record<string, string>;

let _itemKey = 0;
const nextKey = () => `item-${++_itemKey}`;

const emptyItem = (): SaleItemForm => ({
  key: nextKey(),
  productId: '',
  quantity: '1',
  unitPrice: '0.000',
});

const emptyForm = (): SaleForm => ({
  deliveryOrderId: '',
  customerId: '',
  saleDate: new Date().toISOString().slice(0, 10),
  status: 'DRAFT',
  discount: '0.000',
  notes: '',
  paymentMethod: '',
  items: [emptyItem()],
});

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<SaleStatus, string> = {
  DRAFT:     'border-yellow-500 text-yellow-600',
  CONFIRMED: 'border-blue-500 text-blue-600',
  DELIVERED:  'border-green-500 text-green-600',
  CANCELLED: 'border-destructive text-destructive',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  UNPAID: 'border-destructive text-destructive bg-destructive/10',
  PARTIALLY_PAID: 'border-orange-500 text-orange-600 bg-orange-100 dark:bg-orange-900/20',
  PAID: 'border-green-500 text-green-600 bg-green-100 dark:bg-green-900/20',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchSales = (qs: string) =>
  api.get<PaginatedResponse<SaleListItem>>(`/api/sales?${qs}`);

const fetchSale = (id: string) =>
  api.get<{ data: Sale }>(`/api/sales/${id}`);

const fetchStats = () =>
  api.get<{ data: SaleStatistics }>('/api/sales/statistics');

const fetchCustomers = () =>
  api.get<PaginatedResponse<Customer>>('/api/customers?limit=200&isActive=true');

const fetchProducts = () =>
  api.get<PaginatedResponse<Product>>('/api/products?limit=500&isActive=true');

const createSale = (body: Record<string, unknown>) =>
  api.post<{ data: Sale }>('/api/sales', body);

const updateSale = (id: string, body: Record<string, unknown>) =>
  api.put<{ data: Sale }>(`/api/sales/${id}`, body);

const updateSaleStatus = (id: string, body: { status: string }) =>
  api.patch<{ data: Sale }>(`/api/sales/${id}/status`, body);

const deleteSale = (id: string) =>
  api.del(`/api/sales/${id}`);

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

function SaleViewDialog({
  open, onOpenChange, saleId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId: string | null;
}) {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => fetchSale(saleId!),
    enabled: !!saleId && open,
  });

  const historyQuery = useQuery({
    queryKey: ['sale-history', saleId],
    queryFn: () => api.get<any>(`/sales/${saleId}/history`),
    enabled: !!saleId && open,
  });

  const sale = query.data?.data;
  const history = historyQuery.data?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_sale')}</DialogTitle>
          <DialogDescription>{t('sale_view_desc')}</DialogDescription>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : sale ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">{t('sale_number')}</span>
                <p className="font-mono font-bold">{sale.number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('operational_status')}</span>
                <p>
                  <Badge variant="outline" className={STATUS_COLORS[sale.status]}>
                    {t(`status_${sale.status.toLowerCase()}`)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('financial_status')}</span>
                <p>
                  <Badge variant="outline" className={PAYMENT_STATUS_COLORS[sale.paymentStatus]}>
                    {t(`payment_status_${sale.paymentStatus.toLowerCase()}`)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('sale_customer')}</span>
                <p className="font-medium">{sale.customer.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('sale_date')}</span>
                <p>{new Date(sale.saleDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('sale_created_by')}</span>
                <p>{sale.user.name}</p>
              </div>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-medium mb-2">{t('sale_items')}</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sale_item_product')}</TableHead>
                      <TableHead>{t('sale_item_unit')}</TableHead>
                      <TableHead className="text-end">{t('sale_item_quantity')}</TableHead>
                      <TableHead className="text-end">{t('sale_item_unit_price')}</TableHead>
                      <TableHead className="text-end">{t('sale_item_total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map(item => (
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
                <span className="text-muted-foreground">{t('sale_subtotal')}</span>
                <span className="font-mono">{formatKWD(sale.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('sale_discount')}</span>
                <span className="font-mono">-{formatKWD(sale.discount)}</span>
              </div>

              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>{t('sale_grand_total')}</span>
                <span className="font-mono">{formatKWD(sale.netAmount)}</span>
              </div>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('sale_notes')}</span>
                <p className="mt-1">{sale.notes}</p>
              </div>
            )}

            {/* Audit History */}
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-3 flex items-center">
                <MoreHorizontal className="w-4 h-4 mr-2 text-muted-foreground" />
                Change History
              </h3>
              {historyQuery.isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history found.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
                  {history.map((record: any) => (
                    <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-200 dark:bg-slate-700 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                      <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border shadow-sm bg-card">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-semibold text-sm text-foreground">{record.user.name}</div>
                          <time className="text-xs font-medium text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</time>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.notes}
                        </div>
                        {record.toStatus && (
                          <Badge variant="outline" className={`mt-2 ${STATUS_COLORS[record.toStatus as SaleStatus]}`}>
                            {t(`status_${record.toStatus.toLowerCase()}`)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

import { useAutoTranslate } from '@/hooks/useAutoTranslate';

function QuickCustomerDialog({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (v: boolean) => void, onSuccess: (customerId: string) => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  
  const { handleArabicChange } = useAutoTranslate(name, nameAr, setNameAr);

  const mutation = useMutation({
    mutationFn: (body: any) => api.post<any>('/api/customers', body),
    onSuccess: (res) => {
      toast({ title: t('customer_created') || 'Customer created' });
      onSuccess(res.id);
      onOpenChange(false);
      setName('');
      setNameAr('');
      setPhone('');
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' })
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader><DialogTitle>{t('add_customer')}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>{t('name')} *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('name_ar')}</Label>
            <Input dir="rtl" value={nameAr} onChange={e => handleArabicChange(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t('phone')}</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('cancel')}</Button>
          <Button onClick={() => mutation.mutate({ name, nameAr, phone })} disabled={!name.trim() || mutation.isPending}>{t('create')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaleFormDialog({
  open, onOpenChange, saleId, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId?: string | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!saleId;

  const [form, setForm]     = useState<any>(emptyForm());
  const [errors, setErrors] = useState<any>({});
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const queryClient = useQueryClient();

  const customersQuery = useQuery({ queryKey: ['customers-list'], queryFn: fetchCustomers, enabled: open });
  const productsQuery  = useQuery({ queryKey: ['products-list'], queryFn: fetchProducts, enabled: open });
  const saleQuery      = useQuery({ queryKey: ['sale', saleId], queryFn: () => fetchSale(saleId!), enabled: isEdit && open });
  const doQuery        = useQuery({ queryKey: ['dos-for-invoice'], queryFn: () => api.get<any>('/api/delivery-orders?limit=100&invoiceStatus=NOT_INVOICED'), enabled: open && !isEdit });

  useEffect(() => {
    if (!open) return;
    if (isEdit && saleQuery.data) {
      const p = saleQuery.data.data;
      setForm({
        deliveryOrderId: p.deliveryOrderId || '',
        customerId: p.customerId,
        saleDate: p.saleDate.slice(0, 10),
        status: p.status === 'DRAFT' ? 'DRAFT' : 'CONFIRMED',
        discount: p.discount,
        notes: p.notes ?? '',
        paymentMethod: p.paymentMethod ?? '',
        items: p.items.map((item: any) => ({
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
  }, [open, isEdit, saleQuery.data]);

  const customers = customersQuery.data?.data ?? [];
  const products  = productsQuery.data?.data ?? [];

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [products]);

  const handleDOSelect = async (doId: string) => {
    if (doId === 'NONE') {
      setForm((prev: any) => ({ ...prev, deliveryOrderId: '', customerId: '', items: [emptyItem()] }));
      return;
    }
    try {
      const res = await api.get<any>(`/api/delivery-orders/${doId}`);
      const d = res.data;
      
      const aggregatedItems = d.items.reduce((acc: any[], item: any) => {
        const existing = acc.find(x => x.productId === item.productId);
        if (existing) {
          existing.quantity = (Number(existing.quantity) + Number(item.quantity)).toFixed(3);
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []);

      setForm((prev: any) => ({
        ...prev,
        deliveryOrderId: d.id,
        customerId: d.customerId,
        items: aggregatedItems.map((i: any) => ({
          key: nextKey(),
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: productMap.get(i.productId)?.sellingPrice ?? '0.000'
        }))
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const updateItem = (key: string, field: string, value: string) => {
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((it: any) => it.key === key ? { ...it, [field]: value } : it),
    }));
  };

  const removeItem = (key: string) => setForm((prev: any) => ({ ...prev, items: prev.items.filter((it: any) => it.key !== key) }));
  const addItem = () => setForm((prev: any) => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const handleProductSelect = (key: string, productId: string) => {
    const prod = productMap.get(productId);
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.map((it: any) => it.key === key ? { ...it, productId, unitPrice: prod?.sellingPrice ?? '0.000' } : it),
    }));
  };

  const subtotal = useMemo(() => form.items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [form.items]);
  const grandTotal = useMemo(() => subtotal - (Number(form.discount) || 0), [subtotal, form.discount]);

  const applyFieldErrors = (raw: any) => {
    if (!raw?.length) return false;
    const fe: any = {};
    raw.forEach(({ field: f, message: m }: any) => { fe[f] = m; });
    setErrors(fe);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => { toast({ title: t('sale_created') }); onSuccess(); onOpenChange(false); },
    onError: (err: any) => { if (!applyFieldErrors(err.errors)) toast({ title: t('error'), description: err.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => updateSale(saleId!, body),
    onSuccess: () => { toast({ title: t('sale_updated') }); onSuccess(); onOpenChange(false); },
    onError: (err: any) => { if (!applyFieldErrors(err.errors)) toast({ title: t('error'), description: err.message, variant: 'destructive' }); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const fe: any = {};
    if (!form.customerId) fe.customerId = 'Customer is required';
    if (!form.items.length || form.items.every((it: any) => !it.productId)) fe.items = t('sale_no_items');
    if (Object.keys(fe).length) { setErrors(fe); return; }

    const body: any = {
      deliveryOrderId: form.deliveryOrderId || undefined,
      customerId: form.customerId,
      saleDate: form.saleDate,
      status: form.status,
      discount: form.discount,
      notes: form.notes || undefined,
      paymentMethod: form.paymentMethod || undefined,
      items: form.items.filter((it: any) => it.productId).map((it: any) => ({ productId: it.productId, quantity: it.quantity, unitPrice: it.unitPrice })),
    };
    isEdit ? updateMutation.mutate(body) : createMutation.mutate(body);
  };

  const isDataLoading = customersQuery.isLoading || productsQuery.isLoading || (isEdit && saleQuery.isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit_sale') : t('add_sale')}</DialogTitle>
          <DialogDescription>{isEdit ? t('sale_edit_desc') : t('sale_add_desc')}</DialogDescription>
        </DialogHeader>

        {isDataLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div className="grid grid-cols-1 mb-4">
                <div className="space-y-1">
                  <Label>{t('do_select_optional', 'Select Delivery Order (Optional)')}</Label>
                  <Select value={form.deliveryOrderId || 'NONE'} onValueChange={handleDOSelect}>
                    <SelectTrigger><SelectValue placeholder="Direct Invoice (No DO)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Direct Invoice (No DO)</SelectItem>
                      {doQuery.data?.data?.filter((d: any) => d.status === 'DISPATCHED' || d.status === 'DELIVERED').map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.number} - {d.customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-customer">{t('sale_customer')} <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Select value={form.customerId} onValueChange={v => setForm((prev: any) => ({ ...prev, customerId: v }))} disabled={isPending || !!form.deliveryOrderId}>
                    <SelectTrigger id="p-customer" className="flex-1"><SelectValue placeholder={t('sale_select_customer')} /></SelectTrigger>
                    <SelectContent>
                      {customers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setQuickCustomerOpen(true)} disabled={isPending || !!form.deliveryOrderId}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.customerId && <p className="text-sm text-destructive">{errors.customerId}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-date">{t('sale_date')}</Label>
                <Input id="p-date" type="date" value={form.saleDate} onChange={e => setForm((prev: any) => ({ ...prev, saleDate: e.target.value }))} disabled={isPending} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="p-status">{t('sale_status')}</Label>
                <Select value={form.status} onValueChange={v => setForm((prev: any) => ({ ...prev, status: v as 'DRAFT' | 'CONFIRMED' }))} disabled={isPending}>
                  <SelectTrigger id="p-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">{t('status_draft')}</SelectItem>
                    <SelectItem value="CONFIRMED">{t('status_confirmed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t('payment_method')}</Label>
                <Select value={form.paymentMethod || 'NONE'} onValueChange={v => setForm((prev: any) => ({ ...prev, paymentMethod: v === 'NONE' ? '' : v }))} disabled={isPending}>
                  <SelectTrigger><SelectValue placeholder="Select Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">None</SelectItem>
                    <SelectItem value="CASH">{t('payment_method_cash', 'Cash')}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t('payment_method_bank_transfer', 'Bank Transfer')}</SelectItem>
                    <SelectItem value="CHEQUE">{t('payment_method_cheque', 'Cheque')}</SelectItem>
                    <SelectItem value="CREDIT_CARD">{t('payment_method_card', 'Credit Card')}</SelectItem>
                    <SelectItem value="ONLINE_TRANSFER">{t('payment_method_online', 'Online Transfer')}</SelectItem>
                    <SelectItem value="OTHER">{t('payment_method_other', 'Other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('sale_items')}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isPending}>
                  <Plus className="h-3 w-3 me-1" /> {t('sale_add_item')}
                </Button>
              </div>
              {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t('sale_item_product')}</TableHead>
                      <TableHead className="w-[20%]">{t('sale_item_qty')}</TableHead>
                      <TableHead className="w-[20%]">{t('sale_item_price')}</TableHead>
                      <TableHead className="text-end w-[15%]">{t('sale_item_total')}</TableHead>
                      <TableHead className="w-[5%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item: any, i: number) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <TableRow key={item.key}>
                          <TableCell>
                            <Select value={item.productId} onValueChange={v => handleProductSelect(item.key, v)} disabled={isPending}>
                              <SelectTrigger className={errors[`items.${i}.productId`] ? 'border-destructive' : ''}><SelectValue placeholder={t('sale_select_product')} /></SelectTrigger>
                              <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent>
                            </Select>
                            {errors[`items.${i}.productId`] && <p className="text-xs text-destructive mt-1">{errors[`items.${i}.productId`]}</p>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.001" value={item.quantity} onChange={e => updateItem(item.key, 'quantity', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} className={errors[`items.${i}.quantity`] ? 'border-destructive' : ''} />
                            {errors[`items.${i}.quantity`] && <p className="text-xs text-destructive mt-1">{errors[`items.${i}.quantity`]}</p>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.001" value={item.unitPrice} onChange={e => updateItem(item.key, 'unitPrice', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} className={errors[`items.${i}.unitPrice`] ? 'border-destructive' : ''} />
                            {errors[`items.${i}.unitPrice`] && <p className="text-xs text-destructive mt-1">{errors[`items.${i}.unitPrice`]}</p>}
                          </TableCell>
                          <TableCell className="text-end font-mono text-sm">{formatKWD(lineTotal)}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => removeItem(item.key)} disabled={isPending || form.items.length <= 1}>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-discount">{t('sale_discount')}</Label>
                <Input id="p-discount" type="number" min="0" step="0.001" value={form.discount} onChange={e => setForm((prev: any) => ({ ...prev, discount: e.target.value }))} onFocus={e => e.target.select()} disabled={isPending} />
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <div className="text-sm text-muted-foreground">{t('sale_grand_total')}</div>
                <div className="text-xl font-bold font-mono">{formatKWD(grandTotal)}</div>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-notes">{t('sale_notes')}</Label>
              <Textarea id="p-notes" value={form.notes} onChange={e => setForm((prev: any) => ({ ...prev, notes: e.target.value }))} rows={2} disabled={isPending} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{t('cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? t('saving') : isEdit ? t('save_changes') : t('create')}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
      {quickCustomerOpen && (
        <QuickCustomerDialog
          open={quickCustomerOpen}
          onOpenChange={setQuickCustomerOpen}
          onSuccess={(customerId) => {
            queryClient.invalidateQueries({ queryKey: ['customers-list'] }).then(() => {
              setForm((prev: any) => ({ ...prev, customerId }));
            });
          }}
        />
      )}
    </Dialog>
  );
}

import { useLogout, useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';

// ─── Sales page ───────────────────────────────────────────────────────────

export default function SalesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });

  // Filters & pagination
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [page,         setPage]         = useState(1);
  const LIMIT = 20;

  const debouncedSearch = useDebounce(search, 400);

  // Dialog state
  const [createOpen,      setCreateOpen]      = useState(false);
  const [editTargetId,    setEditTargetId]    = useState<string | null>(null);
  const [viewTargetId,    setViewTargetId]    = useState<string | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<SaleListItem | null>(null);
  const [statusTarget,    setStatusTarget]    = useState<{ id: string; newStatus: SaleStatus } | null>(null);

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
  const salesQuery = useQuery({
    queryKey: ['sales', debouncedSearch, statusFilter, sortBy, page],
    queryFn:  () => fetchSales(qs),
  });

  const statsQuery = useQuery({
    queryKey: ['sales-statistics'],
    queryFn:  fetchStats,
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteSale(deleteTarget!.id),
    onSuccess: () => {
      toast({ title: t('sale_deleted') });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  // ── Status mutation ─────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: () => updateSaleStatus(statusTarget!.id, { status: statusTarget!.newStatus }),
    onSuccess: () => {
      toast({ title: t('sale_status_updated') });
      setStatusTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setStatusTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    void queryClient.invalidateQueries({ queryKey: ['dos-for-invoice'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = salesQuery.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('sales')}</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t('add_sale')}
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title={t('sale_stat_total')}
          value={stats?.total ?? 0}
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('sale_stat_draft')}
          value={stats?.draft ?? 0}
          icon={<FileText className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('sale_stat_confirmed')}
          value={stats?.confirmed ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('sale_stat_delivered')}
          value={stats?.delivered ?? 0}
          icon={<PackageCheck className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('sale_stat_cancelled')}
          value={stats?.cancelled ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('sale_stat_amount')}
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
            placeholder={t('sale_search_placeholder')}
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
            <SelectItem value="all">{t('all_sale_statuses')}</SelectItem>
            <SelectItem value="DRAFT">{t('status_draft')}</SelectItem>
            <SelectItem value="CONFIRMED">{t('status_confirmed')}</SelectItem>
            <SelectItem value="DELIVERED">{t('status_delivered')}</SelectItem>
            <SelectItem value="CANCELLED">{t('status_cancelled')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={v => { setSortBy(v); setPage(1); }}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t('sort_sale_date')}</SelectItem>
            <SelectItem value="number">{t('sort_sale_number')}</SelectItem>
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
                <TableHead>{t('sale_number')}</TableHead>
                <TableHead>{t('do_sales_order', 'Internal SO')}</TableHead>
                <TableHead>{t('sale_customer')}</TableHead>
                <TableHead>{t('sale_date')}</TableHead>
                <TableHead>{t('sale_items')}</TableHead>
                <TableHead className="text-end">{t('sale_grand_total')}</TableHead>
                <TableHead className="text-end">{t('paid_amount')}</TableHead>
                <TableHead className="text-end">{t('outstanding_amount')}</TableHead>
                <TableHead>{t('operational_status')}</TableHead>
                <TableHead>{t('financial_status')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 11 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : salesQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-destructive">
                    {t('no_records')}
                  </TableCell>
                </TableRow>
              ) : !list?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                    {debouncedSearch ? t('sale_no_results') : t('sale_empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map(sale => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm font-medium">{sale.number}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{sale.internalSONumber}</div>
                      {sale.customerPONumber && <div className="text-xs text-muted-foreground">{sale.customerPONumber}</div>}
                    </TableCell>
                    <TableCell>{sale.customer.name}</TableCell>
                    <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {t('sale_items_count', { count: sale.itemCount })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatKWD(sale.netAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-green-600">
                      {formatKWD(sale.paidAmount)}
                    </TableCell>
                    <TableCell className="text-end font-mono text-destructive">
                      {formatKWD(sale.outstandingAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[sale.status]}>
                        {t(`status_${sale.status.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PAYMENT_STATUS_COLORS[sale.paymentStatus]}>
                        {t(`payment_status_${sale.paymentStatus.toLowerCase()}`)}
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
                            <DropdownMenuItem onClick={() => setViewTargetId(sale.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('view_sale')}
                            </DropdownMenuItem>

                            {sale.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: sale.id, newStatus: 'CONFIRMED' })}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                {t('confirm_sale')}
                              </DropdownMenuItem>
                            )}
                            
                            {sale.status === 'CONFIRMED' && (
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: sale.id, newStatus: 'DELIVERED' })}>
                                <PackageCheck className="mr-2 h-4 w-4" />
                                {t('deliver_sale')}
                              </DropdownMenuItem>
                            )}

                            {sale.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => setEditTargetId(sale.id)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                {t('edit')}
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => {
                              window.open('/documents/sales-invoice/' + sale.id, '_blank');
                            }}>
                              <FileText className="mr-2 h-4 w-4" />
                              {t('sale_export_pdf')}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              toast({ title: t('sale_export_xls'), description: t('coming_soon') });
                            }}>
                              <Download className="mr-2 h-4 w-4" />
                              {t('sale_export_xls')}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => window.open('/documents/sales-invoice/' + sale.id + '?print=true', '_blank')}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t('print')}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {sale.status !== 'CANCELLED' && (
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setStatusTarget({ id: sale.id, newStatus: 'CANCELLED' })}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                {t('cancel_sale')}
                              </DropdownMenuItem>
                            )}

                            {(sale.status === 'DRAFT' || (sale.status === 'CANCELLED' && user?.role === 'OWNER')) && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => setDeleteTarget(sale)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {t('delete')}
                              </DropdownMenuItem>
                            )}
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
      <SaleFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={invalidate}
      />

      {/* Edit dialog */}
      <SaleFormDialog
        open={!!editTargetId}
        onOpenChange={open => !open && setEditTargetId(null)}
        saleId={editTargetId}
        onSuccess={invalidate}
      />

      {/* View dialog */}
      <SaleViewDialog
        open={!!viewTargetId}
        onOpenChange={open => !open && setViewTargetId(null)}
        saleId={viewTargetId}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('delete_sale_confirm')}
        description={
          deleteTarget?.status === 'CANCELLED'
            ? t('sale_delete_cancelled_warning', 'Are you sure? This is a cancelled document. Deleting it will permanently remove it from the system, but since it is already cancelled, inventory has already been restored.')
            : t('sale_delete_desc')
        }
        confirmLabel={t('delete')}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
      />

      {/* Status change confirmation */}
      <ConfirmDialog
        open={!!statusTarget}
        title={t('sale_confirm_status')}
        description={t('sale_confirm_status_desc')}
        confirmLabel={statusTarget ? t(`status_${statusTarget.newStatus.toLowerCase()}`) : ''}
        onConfirm={() => statusMutation.mutate()}
        onCancel={() => setStatusTarget(null)}
        loading={statusMutation.isPending}
      />
    </div>
  );
}

