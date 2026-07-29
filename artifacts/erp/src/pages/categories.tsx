import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Loader2, PackageOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { api } from '@/lib/api';
import type { Category, PaginatedResponse } from '@/lib/types';

const LIMIT = 20;

interface CategoryForm {
  name: string;
  nameAr: string;
  description: string;
  isActive: boolean;
}

const emptyForm = (): CategoryForm => ({ name: '', nameAr: '', description: '', isActive: true });

export default function Categories() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isRtl = i18n.language === 'ar';

  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery<PaginatedResponse<Category>>({
    queryKey: ['categories', page, search],
    queryFn: () => api.get(`/categories?${params}`),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });

  const createMutation = useMutation({
    mutationFn: (body: CategoryForm) => api.post<Category>('/categories', body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('category_created') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: CategoryForm) => api.put<Category>(`/categories/${editing!.id}`, body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('category_updated') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/categories/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: t('category_deleted') }); },
    onError: (e: Error) => { setDeleteTarget(null); toast({ title: t('error'), description: e.message, variant: 'destructive' }); },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const { handleArabicChange, resetTranslationState } = useAutoTranslate(
    form.name,
    form.nameAr,
    (text) => setForm((prev) => ({ ...prev, nameAr: text }))
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm()); resetTranslationState(); setModalOpen(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    resetTranslationState();
    setForm({ name: c.name, nameAr: c.nameAr ?? '', description: c.description ?? '', isActive: c.isActive });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSearch = useCallback(() => { setSearch(draftSearch); setPage(1); }, [draftSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) updateMutation.mutate(form);
    else createMutation.mutate(form);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('categories')}</h1>
        <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('add_category')}
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={draftSearch}
            onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={t('search_placeholder')}
            className="w-full ps-9 pe-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-medium border rounded-md bg-background hover:bg-accent transition-colors">
          {t('search_btn')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b uppercase">
              <tr>
                <th className="px-6 py-3 text-start font-medium">{t('name_en')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('name_ar')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('description_field')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('status')}</th>
                <th className="px-6 py-3 text-end font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                </td></tr>
              )}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-16 text-center">
                  <PackageOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t('no_records')}</p>
                </td></tr>
              )}
              {data?.data.map((cat) => (
                <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{cat.name}</td>
                  <td className="px-6 py-4 text-muted-foreground" dir="rtl">{cat.nameAr || '—'}</td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{cat.description || '—'}</td>
                  <td className="px-6 py-4">
                    <StatusBadge active={cat.isActive} t={t} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(cat)} title={t('edit')} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(cat)} title={t('delete')} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <Pagination meta={meta} page={page} setPage={setPage} t={t} isRtl={isRtl} />
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? t('edit_category') : t('add_category')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <FormField label={t('name_en')} required>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input" placeholder="e.g. Cement & Concrete" />
            </FormField>
            <FormField label={t('name_ar')}>
              <input dir="rtl" value={form.nameAr} onChange={(e) => handleArabicChange(e.target.value)}
                className="form-input" placeholder="مثال: الإسمنت والخرسانة" />
            </FormField>
            <FormField label={t('description_field')}>
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="form-input resize-none" placeholder={t('optional')} />
            </FormField>
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                {t('active')}
              </label>
            )}
            <DialogFooter className="pt-2 gap-2">
              <button type="button" onClick={closeModal} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('save')}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t('delete_category_confirm')}
        description={`${t('delete_message')} "${deleteTarget?.name}"`}
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ active, t }: { active: boolean; t: (k: string) => string }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      {t('active')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      {t('inactive')}
    </span>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ms-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Pagination({ meta, page, setPage, t, isRtl }: {
  meta: { total: number; page: number; limit: number; pages: number };
  page: number; setPage: (p: number) => void; t: (k: string) => string; isRtl: boolean;
}) {
  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
      <span>{t('showing')} {start}–{end} {t('of')} {meta.total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">
          {isRtl ? '›' : '‹'}
        </button>
        <span className="px-3">{page} / {meta.pages}</span>
        <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">
          {isRtl ? '‹' : '›'}
        </button>
      </div>
    </div>
  );
}
