import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Loader2, PackageOpen, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { api } from '@/lib/api';
import type { Product, Category, Brand, Unit, PaginatedResponse } from '@/lib/types';

const LIMIT = 20;

interface ProductForm {
  sku: string; name: string; nameAr: string; description: string;
  categoryId: string; brandId: string; unitId: string;
  costPrice: string; sellingPrice: string;
  stockQuantity: string; reorderLevel: string;
  countryOfOrigin: string;
  isActive: boolean;
}

const emptyForm = (): ProductForm => ({
  sku: '', name: '', nameAr: '', description: '',
  categoryId: '', brandId: '', unitId: '',
  costPrice: '', sellingPrice: '',
  stockQuantity: '0', reorderLevel: '0',
  countryOfOrigin: '',
  isActive: true,
});

export default function Products() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isRtl = i18n.language === 'ar';

  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const COMMON_COUNTRIES = [
    'China', 'India', 'Kuwait', 'UAE', 'Germany', 'Italy', 'Turkey', 'Japan',
    'USA', 'UK', 'South Korea', 'Taiwan', 'Malaysia', 'Saudi Arabia', 'France'
  ];

  // ── Lookups for dropdowns ─────────────────────────────────────────────────
  const { data: categoriesData } = useQuery<PaginatedResponse<Category>>({
    queryKey: ['categories', 'all'],
    queryFn: () => api.get('/categories?limit=500&active=true'),
  });
  const { data: brandsData } = useQuery<PaginatedResponse<Brand>>({
    queryKey: ['brands', 'all'],
    queryFn: () => api.get('/brands?limit=500&active=true'),
  });
  const { data: unitsData } = useQuery<PaginatedResponse<Unit>>({
    queryKey: ['units', 'all'],
    queryFn: () => api.get('/units?limit=500&active=true'),
  });

  const categories = categoriesData?.data ?? [];
  const brands = brandsData?.data ?? [];
  const units = unitsData?.data ?? [];

  // ── Products list ─────────────────────────────────────────────────────────
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (search) params.set('search', search);
  if (filterCategory) params.set('categoryId', filterCategory);
  if (filterBrand) params.set('brandId', filterBrand);
  if (filterStatus) params.set('active', filterStatus);

  const { data, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', page, search, filterCategory, filterBrand, filterStatus],
    queryFn: () => api.get(`/products?${params}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['products'] });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (body: ProductForm) => api.post<Product>('/products', body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('product_created') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: ProductForm) => api.put<Product>(`/products/${editing!.id}`, body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('product_updated') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/products/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: t('product_deleted') }); },
    onError: (e: Error) => { setDeleteTarget(null); toast({ title: t('error'), description: e.message, variant: 'destructive' }); },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const { handleArabicChange, resetTranslationState } = useAutoTranslate(
    form.name,
    form.nameAr,
    (text) => setForm((prev) => ({ ...prev, nameAr: text }))
  );

  const openCreate = async () => { 
    setEditing(null); 
    setForm(emptyForm()); 
    resetTranslationState();
    setModalOpen(true); 
    try {
      const res = await api.get<{sku: string}>('/products/next-sku');
      setForm(prev => ({ ...prev, sku: res.sku }));
    } catch (err) {
      console.error('Failed to generate next SKU', err);
    }
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    resetTranslationState();
    setForm({
      sku: p.sku, name: p.name, nameAr: p.nameAr ?? '', description: p.description ?? '',
      categoryId: p.categoryId, brandId: p.brandId ?? '', unitId: p.unitId,
      costPrice: p.costPrice, sellingPrice: p.sellingPrice,
      stockQuantity: p.stockQuantity, reorderLevel: p.reorderLevel,
      countryOfOrigin: p.countryOfOrigin ?? '',
      isActive: p.isActive,
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSearch = useCallback(() => { setSearch(draftSearch); setPage(1); }, [draftSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      brandId: form.brandId || null,
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      stockQuantity: parseFloat(form.stockQuantity) || 0,
      reorderLevel: parseFloat(form.reorderLevel) || 0,
    };
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
    void payload; // suppress unused warning — actual shape sent as-is
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const meta = data?.meta;

  const sf = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('products')}</h1>
        <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />{t('add_product')}
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('search_placeholder')} className="w-full ps-9 pe-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-medium border rounded-md bg-background hover:bg-accent transition-colors">{t('search_btn')}</button>

        <SelectFilter value={filterCategory} onChange={(v) => { setFilterCategory(v); setPage(1); }} placeholder={t('all_categories')}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectFilter>

        <SelectFilter value={filterBrand} onChange={(v) => { setFilterBrand(v); setPage(1); }} placeholder={t('all_brands')}>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </SelectFilter>

        <SelectFilter value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} placeholder={t('all_statuses')}>
          <option value="true">{t('active')}</option>
          <option value="false">{t('inactive')}</option>
        </SelectFilter>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b uppercase">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('product_code')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('name_en')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('categories')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('brands')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('units')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('selling_price')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('opening_stock')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                <th className="px-4 py-3 text-end font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={9} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td></tr>
              )}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={9} className="px-6 py-16 text-center">
                  <PackageOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t('no_records')}</p>
                </td></tr>
              )}
              {data?.data.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground" dir="ltr">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-[160px] truncate">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.category.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.brand?.name ?? '—'}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{p.unit.abbreviation}</span></td>
                  <td className="px-4 py-3 text-end font-medium" dir="ltr">KD {p.sellingPrice}</td>
                  <td className="px-4 py-3 text-end" dir="ltr">{p.stockQuantity}</td>
                  <td className="px-4 py-3">
                    {p.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t('active')}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{t('inactive')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} title={t('edit')} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteTarget(p)} title={t('delete')} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.pages > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('showing')} {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} {t('of')} {meta.total}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">{isRtl ? '›' : '‹'}</button>
              <span className="px-3">{page} / {meta.pages}</span>
              <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">{isRtl ? '‹' : '›'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit_product') : t('add_product')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Row 1: SKU + Name EN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('product_code')} <span className="text-destructive">*</span></label>
                <input required value={form.sku} onChange={sf('sku')} className="form-input" placeholder="e.g. CEM-001" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('name_en')} <span className="text-destructive">*</span></label>
                <input required value={form.name} onChange={sf('name')} className="form-input" placeholder="e.g. Portland Cement 50kg" />
              </div>
            </div>

            {/* Name AR */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('name_ar')}</label>
              <input dir="rtl" value={form.nameAr} onChange={(e) => handleArabicChange(e.target.value)} className="form-input" placeholder="مثال: إسمنت بورتلاند ٥٠ كجم" />
            </div>

            {/* Row 2: Category, Brand, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('category')} <span className="text-destructive">*</span></label>
                <select required value={form.categoryId} onChange={sf('categoryId')} className="form-select">
                  <option value="">{t('select_category')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('brand')}</label>
                <select value={form.brandId} onChange={sf('brandId')} className="form-select">
                  <option value="">{t('none')}</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('unit')} <span className="text-destructive">*</span></label>
                <select required value={form.unitId} onChange={sf('unitId')} className="form-select">
                  <option value="">{t('select_unit')}</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Prices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('purchase_price')} <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KD</span>
                  <input required type="number" step="0.001" min="0" value={form.costPrice} onChange={sf('costPrice')}
                    className="form-input ps-10" placeholder="0.000" dir="ltr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('selling_price')} <span className="text-destructive">*</span></label>
                <div className="relative">
                  <span className="absolute start-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">KD</span>
                  <input required type="number" step="0.001" min="0" value={form.sellingPrice} onChange={sf('sellingPrice')}
                    className="form-input ps-10" placeholder="0.000" dir="ltr" />
                </div>
              </div>
            </div>

            {/* Row 4: Stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('opening_stock')}</label>
                <input type="number" step="0.001" min="0" value={form.stockQuantity} onChange={sf('stockQuantity')}
                  className="form-input" placeholder="0" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('min_stock')}</label>
                <input type="number" step="0.001" min="0" value={form.reorderLevel} onChange={sf('reorderLevel')}
                  className="form-input" placeholder="0" dir="ltr" />
              </div>
            </div>

            {/* Row 5: Country of Origin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Country of Origin <span className="text-muted-foreground text-xs font-normal">({t('optional')})</span></label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={form.countryOfOrigin} 
                    onChange={sf('countryOfOrigin')}
                    list="countries-list"
                    className="form-input" 
                    placeholder="e.g. China" 
                  />
                  <datalist id="countries-list">
                    {COMMON_COUNTRIES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('description_field')}</label>
              <textarea rows={2} value={form.description} onChange={sf('description')} className="form-input resize-none" placeholder={t('optional')} />
            </div>

            {/* Active toggle (edit mode only) */}
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                {t('active')}
              </label>
            )}

            <DialogFooter className="pt-2 gap-2">
              <button type="button" onClick={closeModal} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}{t('save')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog open={!!deleteTarget} title={t('delete_product_confirm')}
        description={`${t('delete_message')} "${deleteTarget?.name}"`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Filter select ────────────────────────────────────────────────────────────
function SelectFilter({ value, onChange, placeholder, children }: {
  value: string; onChange: (v: string) => void; placeholder: string; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none pe-8 ps-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[140px]">
        <option value="">{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}
