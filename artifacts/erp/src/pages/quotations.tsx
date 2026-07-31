import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, Eye,
  FileText, CheckCircle, XCircle, Clock, CheckSquare, RefreshCw, X, MoreHorizontal, Printer, Download, Copy, ExternalLink, Banknote
} from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import { useCompanyProfile } from '@/modules/settings/hooks/useSettings';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { formatKWD } from '@/lib/utils';
import type {
  Quotation, QuotationListItem, QuotationStatistics,
  PaginatedResponse, Customer, Product, QuotationStatus,
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

import { useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuotationItemForm {
  key: string;
  productId: string;
  description: string;
  countryOfOrigin: string;
  quantity: string;
  unitPrice: string;
}

interface QuotationForm {
  customerId: string;
  customerName: string;
  customerNameAr: string;
  quotationBy: string;
  quotationByAr: string;
  quotationByAddress: string;
  quotationDate: string;
  validityDate: string;
  status: 'DRAFT' | 'SENT';
  referenceNumber: string;
  customerReference: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  discount: string;
  roundOff: string;
  notes: string;
  termsAndConditions: string;
  items: QuotationItemForm[];
}

let _itemKey = 0;
const nextKey = () => `item-${++_itemKey}`;

const emptyItem = (): QuotationItemForm => ({
  key: nextKey(),
  productId: '',
  description: '',
  countryOfOrigin: '',
  quantity: '1',
  unitPrice: '0.000',
});

const emptyForm = (): QuotationForm => ({
  customerId: '',
  customerName: '',
  customerNameAr: '',
  quotationBy: '',
  quotationByAr: '',
  quotationByAddress: '',
  quotationDate: new Date().toISOString().slice(0, 10),
  validityDate: '',
  status: 'DRAFT',
  referenceNumber: '',
  customerReference: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  country: '',
  discount: '0.000',
  roundOff: '0.000',
  notes: '',
  termsAndConditions: 'Terms and Conditions:\n1. prices are subject to stock avability\n2. this quoatation is valid for 15 days\n3. goods once sold van be returned or exchanged within 15 days as if in same condition',
  items: [emptyItem()],
});

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<QuotationStatus, string> = {
  DRAFT:     'border-gray-500 text-gray-600',
  SENT:      'border-blue-500 text-blue-600',
  ACCEPTED:  'border-green-500 text-green-600 bg-green-50',
  REJECTED:  'border-red-500 text-red-600',
  EXPIRED:   'border-orange-500 text-orange-600',
  CANCELLED: 'border-destructive text-destructive',
  CONVERTED: 'border-purple-500 text-purple-600 bg-purple-50',
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchQuotations = (qs: string) => api.get<PaginatedResponse<QuotationListItem>>(`/api/quotations?${qs}`);
const fetchQuotation = (id: string) => api.get<{ data: Quotation }>(`/api/quotations/${id}`);
const fetchStats = () => api.get<{ data: QuotationStatistics }>('/api/quotations/statistics');
const fetchCustomers = () => api.get<PaginatedResponse<Customer>>('/api/customers?limit=200&isActive=true');
const fetchProducts = () => api.get<PaginatedResponse<Product>>('/api/products?limit=500&isActive=true');

const createQuotation = (body: Record<string, unknown>) => api.post<{ data: Quotation }>('/api/quotations', body);
const updateQuotation = (id: string, body: Record<string, unknown>) => api.put<{ data: Quotation }>(`/api/quotations/${id}`, body);
const updateQuotationStatus = (id: string, body: { status: string }) => api.patch<{ data: Quotation }>(`/api/quotations/${id}/status`, body);
const duplicateQuotation = (id: string) => api.post<{ data: Quotation }>(`/api/quotations/${id}/duplicate`, {});
const convertQuotation = (id: string) => api.post<{ data: Quotation }>(`/api/quotations/${id}/convert`, {});
const deleteQuotation = (id: string) => api.del(`/api/quotations/${id}`);

// ─── Stat card ────────────────────────────────────────────────────────────────

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

// ─── View dialog ──────────────────────────────────────────────────────────────

function QuotationViewDialog({ open, onOpenChange, quotationId }: { open: boolean; onOpenChange: (v: boolean) => void; quotationId: string | null; }) {
  const { t } = useTranslation();

  const query = useQuery({
    queryKey: ['quotation', quotationId],
    queryFn: () => fetchQuotation(quotationId!),
    enabled: !!quotationId && open,
  });

  const historyQuery = useQuery({
    queryKey: ['quotation-history', quotationId],
    queryFn: () => api.get<any>(`/api/quotations/${quotationId}/history`),
    enabled: !!quotationId && open,
  });

  const q = query.data?.data;
  const history = historyQuery.data?.data || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('view_quotation', 'View Quotation')}</DialogTitle>
        </DialogHeader>

        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
          </div>
        ) : q ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('number', 'Number')}</span>
                <p className="font-mono font-bold">{q.number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('status')}</span>
                <p>
                  <Badge variant="outline" className={STATUS_COLORS[q.status]}>
                    {t(`status_${q.status}`)}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('customer', 'Customer')}</span>
                <p className="font-medium">{(q as any).customerName || q.customer?.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('date', 'Date')}</span>
                <p>{new Date(q.quotationDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Validity Date</span>
                <p>{q.validityDate ? new Date(q.validityDate).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">{t('created_by', 'Created By')}</span>
                <p>{q.user.name}</p>
              </div>
              {q.convertedToSale && (
                <div className="col-span-full bg-purple-50 p-2 rounded border border-purple-100 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-900">Converted to Sales Invoice: <a href={`/sales`} className="font-bold underline">{q.convertedToSale.number}</a></span>
                </div>
              )}
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-medium mb-2">{t('items', 'Items')}</h3>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Country of Origin</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-end">Qty</TableHead>
                      <TableHead className="text-end">Price</TableHead>
                      <TableHead className="text-end">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {q.items.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{item.product.name}</span>
                            <span className="block text-xs text-muted-foreground font-mono">{item.product.sku}</span>
                            {item.description && <span className="block text-xs text-muted-foreground mt-0.5">{item.description}</span>}
                          </div>
                        </TableCell>
                        <TableCell>{item.countryOfOrigin || '-'}</TableCell>
                        <TableCell>{item.product.unit.abbreviation}</TableCell>
                        <TableCell className="text-end font-mono">{item.quantity}</TableCell>
                        <TableCell className="text-end font-mono">{formatKWD(item.unitPrice)}</TableCell>
                        <TableCell className="text-end font-mono">{formatKWD(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-1 text-sm flex flex-col items-end">
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatKWD(q.totalAmount)}</span>
              </div>
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Discount</span>
                <span className="font-mono text-destructive">-{formatKWD(q.discount)}</span>
              </div>
              <div className="flex justify-between w-64">
                <span className="text-muted-foreground">Round Off</span>
                <span className="font-mono">{formatKWD(q.roundOff)}</span>
              </div>
              <div className="flex justify-between w-64 font-bold text-base border-t mt-2 pt-2">
                <span>Grand Total</span>
                <span className="font-mono">{formatKWD(q.grandTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              {q.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Notes</span>
                  <p className="mt-1 whitespace-pre-wrap">{q.notes}</p>
                </div>
              )}
              {q.termsAndConditions && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Terms & Conditions</span>
                  <p className="mt-1 whitespace-pre-wrap">{q.termsAndConditions}</p>
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

function QuotationFormDialog({ open, onOpenChange, quotationId, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; quotationId?: string | null; onSuccess: () => void; }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!quotationId;

  const [form, setForm] = useState<QuotationForm>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customersQuery = useQuery({ queryKey: ['customers-list'], queryFn: fetchCustomers, enabled: open });
  const productsQuery = useQuery({ queryKey: ['products-list'], queryFn: fetchProducts, enabled: open });
  const quotationQuery = useQuery({ queryKey: ['quotation', quotationId], queryFn: () => fetchQuotation(quotationId!), enabled: isEdit && open });

  const { data: user } = useGetCurrentUser();
  const companyProfileQuery = useCompanyProfile();
  const companyProfile = companyProfileQuery.data;

  const { handleArabicChange: handleCustomerNameArChange, resetTranslationState: resetCustomerTranslation } = useAutoTranslate(
    form.customerName,
    form.customerNameAr,
    (text) => setForm(prev => ({ ...prev, customerNameAr: text }))
  );
  
  const { handleArabicChange: handleQuotationByArChange, resetTranslationState: resetIssuerTranslation } = useAutoTranslate(
    form.quotationBy,
    form.quotationByAr,
    (text) => setForm(prev => ({ ...prev, quotationByAr: text }))
  );

  useEffect(() => {
    if (!open) return;
    if (isEdit && quotationQuery.data) {
      const p = quotationQuery.data.data;
      setForm({
        customerId: p.customerId || '',
        customerName: (p as any).customerName || '',
        customerNameAr: (p as any).customerNameAr || '',
        quotationBy: (p as any).quotationBy || '',
        quotationByAr: (p as any).quotationByAr || '',
        quotationByAddress: (p as any).quotationByAddress || '',
        quotationDate: p.quotationDate.slice(0, 10),
        validityDate: p.validityDate ? p.validityDate.slice(0, 10) : '',
        status: p.status === 'SENT' ? 'SENT' : 'DRAFT',
        referenceNumber: p.referenceNumber ?? '',
        customerReference: p.customerReference ?? '',
        contactPerson: p.contactPerson ?? '',
        phone: p.phone ?? '',
        email: p.email ?? '',
        address: p.address ?? '',
        country: p.country ?? '',
        discount: p.discount,
        roundOff: p.roundOff,
        notes: p.notes ?? '',
        termsAndConditions: p.termsAndConditions ?? '',
        items: p.items.map((item: any) => ({
          key: nextKey(),
          productId: item.productId,
          description: item.description ?? '',
          countryOfOrigin: item.countryOfOrigin ?? '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    } else if (!isEdit) {
      resetCustomerTranslation();
      resetIssuerTranslation();
      const newForm = emptyForm();
      newForm.quotationBy = companyProfile?.nameEn || user?.name || '';
      newForm.quotationByAddress = companyProfile?.addressEn || '';
      setForm(newForm);
    }
    setErrors({});
  }, [open, isEdit, quotationQuery.data, companyProfile, user?.name]);

  const customers = customersQuery.data?.data ?? [];
  const products = productsQuery.data?.data ?? [];

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p: any) => map.set(p.id, p));
    return map;
  }, [products]);

  const updateItem = (key: string, field: keyof QuotationItemForm, value: string) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it => it.key === key ? { ...it, [field]: value } : it),
    }));
  };

  const removeItem = (key: string) => setForm(prev => ({ ...prev, items: prev.items.filter(it => it.key !== key) }));
  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));

  const handleProductSelect = (key: string, productId: string) => {
    const prod = productMap.get(productId);
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it => it.key === key ? { 
        ...it, 
        productId, 
        unitPrice: prod?.sellingPrice ?? '0.000',
        countryOfOrigin: prod?.countryOfOrigin ?? it.countryOfOrigin
      } : it),
    }));
  };

  const subtotal = useMemo(() => form.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [form.items]);
  const grandTotal = useMemo(() => subtotal - (Number(form.discount) || 0) + (Number(form.roundOff) || 0), [subtotal, form.discount, form.roundOff]);

  const applyFieldErrors = (raw: any) => {
    if (!raw?.length) return false;
    const fe: any = {};
    raw.forEach(({ field: f, message: m }: any) => { fe[f] = m; });
    setErrors(fe);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createQuotation,
    onSuccess: () => { toast({ title: t('quotation_created', 'Quotation created') }); onSuccess(); onOpenChange(false); },
    onError: (err: any) => { if (!applyFieldErrors(err.errors)) toast({ title: t('error'), description: err.message, variant: 'destructive' }); },
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => updateQuotation(quotationId!, body),
    onSuccess: () => { toast({ title: t('quotation_updated', 'Quotation updated') }); onSuccess(); onOpenChange(false); },
    onError: (err: any) => { if (!applyFieldErrors(err.errors)) toast({ title: t('error'), description: err.message, variant: 'destructive' }); },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const fe: any = {};
    if (!form.customerId && !form.customerName) fe.customerId = 'Customer or Customer Name is required';
    if (!form.items.length || form.items.every(it => !it.productId)) fe.items = 'Items required';
    if (Object.keys(fe).length) { setErrors(fe); return; }

    const body: any = {
      ...form,
      totalAmount: subtotal.toFixed(3),
      grandTotal: grandTotal.toFixed(3),
      validityDate: form.validityDate || undefined,
      items: form.items.filter(it => it.productId).map(it => ({ 
        productId: it.productId, 
        quantity: it.quantity, 
        unitPrice: it.unitPrice,
        description: it.description || undefined,
        countryOfOrigin: it.countryOfOrigin || undefined
      })),
    };
    isEdit ? updateMutation.mutate(body) : createMutation.mutate(body);
  };

  const isDataLoading = customersQuery.isLoading || productsQuery.isLoading || (isEdit && quotationQuery.isLoading);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit_quotation', 'Edit Quotation') : t('add_quotation', 'Add Quotation')}</DialogTitle>
        </DialogHeader>

        {isDataLoading ? (
          <div className="space-y-3 py-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Header Info */}
            <div className="space-y-6">
              
              {/* Quotation By (Issuer) */}
              <div className="p-4 border rounded-md bg-muted/10 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quotation By (Issuer)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Name (English)</Label>
                    <Input value={form.quotationBy} onChange={e => setForm(prev => ({ ...prev, quotationBy: e.target.value }))} disabled={isPending} />
                  </div>
                  <div className="space-y-1">
                    <Label>Name (Arabic)</Label>
                    <Input value={form.quotationByAr} onChange={e => handleQuotationByArChange(e.target.value)} disabled={isPending} dir="rtl" />
                  </div>
                  <div className="space-y-1">
                    <Label>Our Address</Label>
                    <Input value={form.quotationByAddress} onChange={e => setForm(prev => ({ ...prev, quotationByAddress: e.target.value }))} disabled={isPending} />
                  </div>
                </div>
              </div>

              {/* Quotation To (Client) */}
              <div className="p-4 border rounded-md bg-muted/10 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quotation To (Client)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Existing Customer (Optional)</Label>
                    <Select value={form.customerId} onValueChange={v => setForm(prev => ({ ...prev, customerId: v === 'NONE' ? '' : v }))} disabled={isPending}>
                      <SelectTrigger className={errors.customerId ? 'border-destructive' : ''}><SelectValue placeholder="Select existing customer" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">-- No Existing Customer --</SelectItem>
                        {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {!form.customerId && (
                    <>
                      <div className="space-y-1">
                        <Label>Name (English) <span className="text-destructive">*</span></Label>
                        <Input value={form.customerName} onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))} disabled={isPending} />
                        {errors.customerId && <p className="text-sm text-destructive">{errors.customerId}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label>Name (Arabic)</Label>
                        <Input value={form.customerNameAr} onChange={e => handleCustomerNameArChange(e.target.value)} disabled={isPending} dir="rtl" />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <Label>Client Address</Label>
                        <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} disabled={isPending} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Quotation Details */}
              <div className="p-4 border rounded-md bg-muted/10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Quotation Date</Label>
                    <Input type="date" value={form.quotationDate} onChange={e => setForm(prev => ({ ...prev, quotationDate: e.target.value }))} disabled={isPending} />
                  </div>
                  <div className="space-y-1">
                    <Label>Validity Date</Label>
                    <Input type="date" value={form.validityDate} onChange={e => setForm(prev => ({ ...prev, validityDate: e.target.value }))} disabled={isPending} />
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v as 'DRAFT' | 'SENT' }))} disabled={isPending}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Extra Optional Fields */}
              <div className="p-4 border rounded-md bg-muted/10 space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Additional References</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label>Contact Person</Label>
                    <Input value={form.contactPerson} onChange={e => setForm(prev => ({ ...prev, contactPerson: e.target.value }))} disabled={isPending} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} disabled={isPending} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Customer Reference</Label>
                    <Input value={form.customerReference} onChange={e => setForm(prev => ({ ...prev, customerReference: e.target.value }))} disabled={isPending} placeholder="Optional" />
                  </div>
                  <div className="space-y-1">
                    <Label>Our Reference</Label>
                    <Input value={form.referenceNumber} onChange={e => setForm(prev => ({ ...prev, referenceNumber: e.target.value }))} disabled={isPending} placeholder="Optional" />
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isPending}>
                  <Plus className="h-3 w-3 me-1" /> Add Item
                </Button>
              </div>
              {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}
              <div className="border rounded-md overflow-x-auto">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Product</TableHead>
                      <TableHead className="w-[20%]">Description</TableHead>
                      <TableHead className="w-[15%]">Origin</TableHead>
                      <TableHead className="w-[10%]">Qty</TableHead>
                      <TableHead className="w-[15%]">Price</TableHead>
                      <TableHead className="text-end w-[10%]">Total</TableHead>
                      <TableHead className="w-[5%]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, i) => {
                      const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <TableRow key={item.key}>
                          <TableCell className="align-top">
                            <Select value={item.productId} onValueChange={v => handleProductSelect(item.key, v)} disabled={isPending}>
                              <SelectTrigger className={errors[`items.${i}.productId`] ? 'border-destructive' : ''}><SelectValue placeholder="Select product" /></SelectTrigger>
                              <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="align-top">
                            <Textarea rows={1} value={item.description} onChange={e => updateItem(item.key, 'description', e.target.value)} disabled={isPending} placeholder="Optional details..." className="min-h-[36px]" />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input value={item.countryOfOrigin} onChange={e => updateItem(item.key, 'countryOfOrigin', e.target.value)} disabled={isPending} placeholder="e.g. China" />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input type="number" min="0" step="0.001" value={item.quantity} onChange={e => updateItem(item.key, 'quantity', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} />
                          </TableCell>
                          <TableCell className="align-top">
                            <Input type="number" min="0" step="0.001" value={item.unitPrice} onChange={e => updateItem(item.key, 'unitPrice', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} />
                          </TableCell>
                          <TableCell className="text-end font-mono text-sm align-top pt-4">{formatKWD(lineTotal)}</TableCell>
                          <TableCell className="align-top">
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

            {/* Totals & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} disabled={isPending} />
                </div>
                <div className="space-y-1">
                  <Label>Terms & Conditions</Label>
                  <Textarea value={form.termsAndConditions} onChange={e => setForm(prev => ({ ...prev, termsAndConditions: e.target.value }))} rows={4} disabled={isPending} />
                </div>
              </div>
              
              <div className="space-y-4 border rounded-md p-4 bg-muted/10 h-fit">
                <div className="flex justify-between items-center">
                  <Label>Subtotal</Label>
                  <div className="font-mono text-lg">{formatKWD(subtotal)}</div>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <Label>Discount</Label>
                  <Input type="number" min="0" step="0.001" value={form.discount} onChange={e => setForm(prev => ({ ...prev, discount: e.target.value }))} onFocus={e => e.target.select()} disabled={isPending} className="w-32 text-right text-destructive" />
                </div>
                <div className="flex justify-between items-center gap-4">
                  <Label>Round Off</Label>
                  <Input type="number" step="0.001" value={form.roundOff} onChange={e => setForm(prev => ({ ...prev, roundOff: e.target.value }))} onFocus={e => e.target.select()} disabled={isPending} className="w-32 text-right" />
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <Label className="text-lg">Grand Total</Label>
                  <div className="font-mono text-2xl font-bold">{formatKWD(grandTotal)}</div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>{t('cancel')}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Quotation'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey() } });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | QuotationStatus>('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const debouncedSearch = useDebounce(search, 400);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [viewTargetId, setViewTargetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuotationListItem | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ id: string; newStatus: QuotationStatus } | null>(null);
  const [convertTarget, setConvertTarget] = useState<QuotationListItem | null>(null);

  const qs = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(statusFilter !== 'all' && { status: statusFilter }),
    sortBy,
    sortOrder: 'desc',
    page: String(page),
    limit: String(LIMIT),
  }).toString();

  const quotationsQuery = useQuery({ queryKey: ['quotations', debouncedSearch, statusFilter, sortBy, page], queryFn: () => fetchQuotations(qs) });
  const statsQuery = useQuery({ queryKey: ['quotations-statistics'], queryFn: fetchStats });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['quotations'] });
    void queryClient.invalidateQueries({ queryKey: ['quotations-statistics'] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: () => deleteQuotation(deleteTarget!.id),
    onSuccess: () => { toast({ title: 'Quotation deleted' }); setDeleteTarget(null); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); setDeleteTarget(null); },
  });

  const statusMutation = useMutation({
    mutationFn: () => updateQuotationStatus(statusTarget!.id, { status: statusTarget!.newStatus }),
    onSuccess: () => { toast({ title: 'Status updated' }); setStatusTarget(null); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); setStatusTarget(null); },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateQuotation(id),
    onSuccess: () => { toast({ title: 'Quotation duplicated' }); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertQuotation(convertTarget!.id),
    onSuccess: () => { toast({ title: 'Quotation converted to Sales Invoice' }); setConvertTarget(null); invalidate(); },
    onError: (err: Error) => { toast({ title: 'Error', description: err.message, variant: 'destructive' }); setConvertTarget(null); },
  });

  const handlePrint = (id: string) => {
    window.open(`/documents/quotation/${id}`, '_blank');
  };

  const handleExportExcel = (id: string) => {
    window.open(`/api/quotations/${id}/export-excel`, '_blank');
  };

  const stats = statsQuery.data?.data;
  const data = quotationsQuery.data?.data || [];
  const meta = quotationsQuery.data?.meta;

  const canEdit = ['OWNER', 'ADMIN', 'MANAGER', 'SALES'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('quotations', 'Quotations')}</h1>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> {t('add_quotation', 'Add Quotation')}
          </Button>
        )}
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Quotations" value={stats?.total ?? '-'} icon={<FileText className="w-4 h-4" />} loading={statsQuery.isLoading} />
        <StatCard title="Accepted" value={stats?.accepted ?? '-'} icon={<CheckCircle className="w-4 h-4" />} loading={statsQuery.isLoading} />
        <StatCard title="Converted to Sales" value={stats?.converted ?? '-'} icon={<CheckSquare className="w-4 h-4" />} loading={statsQuery.isLoading} />
        <StatCard title="Total Value (Accepted+)" value={stats ? formatKWD(stats.totalAmount) : '-'} icon={<Banknote className="w-4 h-4" />} loading={statsQuery.isLoading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotations..." className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as any); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{t(`status_${s}`)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-end">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotationsQuery.isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center"><Skeleton className="h-6 w-1/2 mx-auto" /></TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No quotations found.</TableCell></TableRow>
              ) : (
                data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-medium">{q.number}</TableCell>
                    <TableCell>{new Date(q.quotationDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{(q as any).customerName || q.customer?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{q.customer?.code || 'Ad-Hoc'}</div>
                    </TableCell>
                    <TableCell className="text-end font-mono font-medium">{formatKWD(q.grandTotal)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[q.status]}>{t(`status_${q.status}`)}</Badge>
                      {q.convertedToSaleId && <Badge variant="outline" className="ml-1 bg-purple-100 text-purple-700">Invoiced</Badge>}
                    </TableCell>
                    <TableCell className="text-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewTargetId(q.id)}>
                            <Eye className="h-4 w-4 mr-2" /> {t('view_quotation', 'View')}
                          </DropdownMenuItem>
                          
                          {canEdit && (q.status === 'DRAFT' || q.status === 'SENT') && (
                            <DropdownMenuItem onClick={() => setEditTargetId(q.id)}>
                              <Pencil className="h-4 w-4 mr-2" /> {t('edit', 'Edit')}
                            </DropdownMenuItem>
                          )}
                          
                          {canEdit && <DropdownMenuSeparator />}
                          
                          {canEdit && q.status === 'DRAFT' && (
                            <DropdownMenuItem onClick={() => setStatusTarget({ id: q.id, newStatus: 'SENT' })}>
                              <CheckCircle className="h-4 w-4 mr-2" /> Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {canEdit && q.status === 'SENT' && (
                            <>
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: q.id, newStatus: 'ACCEPTED' })} className="text-green-600">
                                <CheckSquare className="h-4 w-4 mr-2" /> Mark as Accepted
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setStatusTarget({ id: q.id, newStatus: 'REJECTED' })} className="text-red-600">
                                <XCircle className="h-4 w-4 mr-2" /> Mark as Rejected
                              </DropdownMenuItem>
                            </>
                          )}

                          {canEdit && q.status === 'ACCEPTED' && !q.convertedToSaleId && (
                            <DropdownMenuItem onClick={() => setConvertTarget(q)} className="text-purple-600 font-medium">
                              <RefreshCw className="h-4 w-4 mr-2" /> Convert to Invoice
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem onClick={() => handlePrint(q.id)}>
                            <Printer className="h-4 w-4 mr-2" /> Print PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportExcel(q.id)}>
                            <Download className="h-4 w-4 mr-2" /> Export Excel
                          </DropdownMenuItem>
                          
                          {canEdit && (
                            <DropdownMenuItem onClick={() => duplicateMutation.mutate(q.id)}>
                              <Copy className="h-4 w-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                          )}
                          
                          {canEdit && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteTarget(q)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> {t('delete', 'Delete')}
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
        
        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('showing')} {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} {t('of')} {meta.total}</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <span className="px-3">{page} / {meta.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= meta.pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <QuotationFormDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={invalidate} />
      <QuotationFormDialog open={!!editTargetId} onOpenChange={(v) => !v && setEditTargetId(null)} quotationId={editTargetId} onSuccess={invalidate} />
      <QuotationViewDialog open={!!viewTargetId} onOpenChange={(v) => !v && setViewTargetId(null)} quotationId={viewTargetId} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t('delete_quotation', 'Delete Quotation?')}
        description={`Are you sure you want to delete quotation ${deleteTarget?.number}? This action cannot be undone.`}
        confirmText={t('delete', 'Delete')}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(v) => !v && setStatusTarget(null)}
        title="Change Status?"
        description={`Are you sure you want to change the status to ${statusTarget?.newStatus}?`}
        confirmText="Confirm"
        onConfirm={() => statusMutation.mutate()}
        loading={statusMutation.isPending}
      />

      <ConfirmDialog
        open={!!convertTarget}
        onOpenChange={(v) => !v && setConvertTarget(null)}
        title="Convert to Sales Invoice?"
        description={`This will create a new Sales Invoice from quotation ${convertTarget?.number}. Do you want to proceed?`}
        confirmText="Convert"
        onConfirm={() => convertMutation.mutate()}
        loading={convertMutation.isPending}
      />
    </div>
  );
}
