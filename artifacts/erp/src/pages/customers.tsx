import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Loader2, Users, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { api } from '@/lib/api';
import type { Customer, PaginatedResponse } from '@/lib/types';
import { formatKWD } from '@/lib/utils';
import { DocumentService } from '@/modules/documents/services/DocumentService';
import { CompanyProfileService } from '@/modules/documents/services/CompanyProfileService';
import { OutstandingInvoicePdf } from '@/modules/documents/components/OutstandingInvoicePdf';

const LIMIT = 20;

interface CustomerForm {
  code: string;
  name: string;
  nameAr: string;
  phone: string;
  countryCode: string;
  email: string;
  address: string;
  creditLimit: string;
  balance: string;
  isActive: boolean;
}

const emptyForm = (code = ''): CustomerForm => ({
  code,
  name: '',
  nameAr: '',
  phone: '',
  countryCode: 'KW',
  email: '',
  address: '',
  creditLimit: '0',
  balance: '0',
  isActive: true,
});

export default function Customers() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isRtl = i18n.language === 'ar';

  const [search, setSearch] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [downloadTarget, setDownloadTarget] = useState<Customer | null>(null);
  const [outstandingSales, setOutstandingSales] = useState<any[] | null>(null);
  const [companyProfile, setCompanyProfile] = useState<any | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
  if (search) params.set('search', search);

  const { data, isLoading } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', page, search],
    queryFn: () => api.get(`/customers?${params}`),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['customers'] });

  const createMutation = useMutation({
    mutationFn: (body: CustomerForm) => api.post<Customer>('/customers', body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('customer_created') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: (body: CustomerForm) => api.put<Customer>(`/customers/${editing!.id}`, body),
    onSuccess: () => { invalidate(); closeModal(); toast({ title: t('customer_updated') }); },
    onError: (e: Error) => toast({ title: t('error'), description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/customers/${id}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: t('customer_deleted') }); },
    onError: (e: Error) => { setDeleteTarget(null); toast({ title: t('error'), description: e.message, variant: 'destructive' }); },
  });

  const nextCustomerCode = useCallback(() => {
    const codes = (data?.data ?? [])
      .map((customer) => customer.code)
      .filter((code) => /^CUST-\d{3}$/i.test(code))
      .map((code) => Number(code.split('-')[1]))
      .sort((a, b) => b - a);
    const latest = codes[0] ?? 0;
    return `CUST-${String(latest + 1).padStart(3, '0')}`;
  }, [data?.data]);

  const { handleArabicChange, resetTranslationState } = useAutoTranslate(
    form.name,
    form.nameAr,
    (text) => setForm((prev) => ({ ...prev, nameAr: text }))
  );

  const openCreate = () => { setEditing(null); setForm(emptyForm(nextCustomerCode())); resetTranslationState(); setModalOpen(true); };
  const openEdit = (customer: Customer) => {
    setEditing(customer);
    resetTranslationState();
    setForm({
      code: customer.code,
      name: customer.name,
      nameAr: customer.nameAr ?? '',
      phone: formatPhoneDisplay(customer.phone),
      countryCode: 'KW',
      email: customer.email ?? '',
      address: customer.address ?? '',
      creditLimit: customer.creditLimit,
      balance: customer.balance,
      isActive: customer.isActive,
    });
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); };
  const handleSearch = useCallback(() => { setSearch(draftSearch); setPage(1); }, [draftSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      toast({ title: t('error'), description: phoneError, variant: 'destructive' });
      return;
    }
    const payload = { ...form, code: form.code.trim(), countryCode: 'KW', phone: formatPhoneInput(form.phone) };
    if (editing) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const handleDownloadClick = async (customer: Customer) => {
    try {
      const res: any = await api.get(`/sales?customerId=${customer.id}&limit=1000`);
      const salesList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      const outstanding = salesList.filter((s: any) => parseFloat(s.outstandingAmount) > 0);
      
      if (outstanding.length === 0) {
        toast({ title: 'No Outstanding Invoices', description: 'This customer has no outstanding invoices.', variant: 'default' });
        return;
      }
      
      const profile = await CompanyProfileService.getProfile();
      setCompanyProfile(profile);
      setOutstandingSales(salesList);
      setDownloadTarget(customer);
    } catch (e) {
      toast({ title: t('error'), description: 'Failed to fetch sales or company profile', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!downloadTarget || !outstandingSales) return;
    const timer = setTimeout(() => {
      DocumentService.downloadPdf(`Outstanding_Invoice_${downloadTarget.name}`, 'outstanding-invoice-pdf')
        .then(() => {
          setDownloadTarget(null);
          setOutstandingSales(null);
          setCompanyProfile(null);
        })
        .catch((err) => {
          console.error('PDF Generation Error:', err);
          toast({ title: 'Error', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
          setDownloadTarget(null);
          setOutstandingSales(null);
          setCompanyProfile(null);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [downloadTarget, outstandingSales]);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('customers')}</h1>
        <button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" />{t('add_customer')}
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder={t('search_placeholder')} className="w-full ps-9 pe-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 text-sm font-medium border rounded-md bg-background hover:bg-accent transition-colors">{t('search_btn')}</button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b uppercase">
              <tr>
                <th className="px-6 py-3 text-start font-medium">{t('customer_code')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('name_en')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('phone')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('receivables', 'Receivables')}</th>
                <th className="px-6 py-3 text-start font-medium">{t('status')}</th>
                <th className="px-6 py-3 text-end font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
              )}
              {!isLoading && data?.data.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm">{t('no_records')}</p>
                </td></tr>
              )}
              {data?.data.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{customer.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{customer.name}</div>
                    {customer.nameAr && <div className="text-muted-foreground text-xs" dir="rtl">{customer.nameAr}</div>}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{formatPhoneDisplay(customer.phone)}</td>
                  <td className="px-6 py-4 text-foreground font-medium">{formatKWD(customer.balance)}</td>
                  <td className="px-6 py-4"><StatusBadge active={customer.isActive} t={t} /></td>
                  <td className="px-6 py-4"><div className="flex items-center justify-end gap-1"><button onClick={() => handleDownloadClick(customer)} title="Download Outstanding Invoice" className="p-1.5 rounded hover:bg-blue-100 text-muted-foreground hover:text-blue-600 transition-colors"><Download className="w-4 h-4" /></button><button onClick={() => openEdit(customer)} title={t('edit')} className="p-1.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="w-4 h-4" /></button><button onClick={() => setDeleteTarget(customer)} title={t('delete')} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && meta.pages > 1 && <Pagination meta={meta} page={page} setPage={setPage} t={t} isRtl={isRtl} />}
      </div>

      <Dialog open={modalOpen} onOpenChange={(v) => !v && closeModal()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>{editing ? t('edit_customer') : t('add_customer')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('customer_code')} <span className="text-destructive">*</span></label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} className="form-input" placeholder="Leave blank to auto-generate" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('name_en')} <span className="text-destructive">*</span></label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="form-input" placeholder="e.g. Ahmed Al-Salem" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('name_ar')}</label>
                <input dir="rtl" value={form.nameAr} onChange={(e) => handleArabicChange(e.target.value)} className="form-input" placeholder="مثال: أحمد السالم" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('phone')}</label>
                <div className="flex gap-2">
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: formatPhoneInput(e.target.value) }))} className="form-input flex-1" placeholder="+965 xxxx xxxx" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="form-input" placeholder="name@example.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('credit_limit')}</label>
                <input type="number" step="0.001" value={form.creditLimit} onFocus={(e) => e.target.select()} onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))} className="form-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('address')}</label>
              <textarea rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="form-input resize-none" placeholder={t('optional')} />
            </div>
            {editing && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                {t('active')}
              </label>
            )}
            <DialogFooter className="pt-2 gap-2">
              <button type="button" onClick={closeModal} className="btn-secondary">{t('cancel')}</button>
              <button type="submit" disabled={isPending} className="btn-primary flex items-center gap-2">{isPending && <Loader2 className="w-4 h-4 animate-spin" />}{t('save')}</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} title={t('delete_customer_confirm')} description={`${t('delete_message')} "${deleteTarget?.name}"`} loading={deleteMutation.isPending} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />
      
      {downloadTarget && outstandingSales && companyProfile && (
        <OutstandingInvoicePdf ref={pdfRef} customer={downloadTarget} sales={outstandingSales} company={companyProfile} />
      )}
    </div>
  );
}

function getPhoneValidationError(value: string) {
  if (!value || !value.trim()) return null;
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
  if (!local) return 'Kuwait mobile number is required';
  if (!/^[569]\d{7}$/.test(local)) {
    return 'Enter a valid Kuwait mobile number starting with 5, 6, or 9';
  }
  return null;
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const local = digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
  const normalized = local.slice(0, 8);
  if (!normalized) return '';
  return `+965 ${normalized.slice(0, 4)}${normalized.length > 4 ? ` ${normalized.slice(4)}` : ''}`;
}

function formatPhoneDisplay(value: string | null) {
  if (!value) return '';
  return formatPhoneInput(value);
}

function formatCreditLimit(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (Number.isNaN(numeric)) return '—';
  return `${numeric.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')} KWD`;
}

function StatusBadge({ active, t }: { active: boolean; t: (k: string) => string }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{t('active')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />{t('inactive')}
    </span>
  );
}

function Pagination({ meta, page, setPage, t, isRtl }: { meta: { total: number; page: number; limit: number; pages: number }; page: number; setPage: (p: number) => void; t: (k: string) => string; isRtl: boolean; }) {
  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="px-6 py-3 border-t flex items-center justify-between text-sm text-muted-foreground">
      <span>{t('showing')} {start}–{end} {t('of')} {meta.total}</span>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">{isRtl ? '›' : '‹'}</button>
        <span className="px-3">{page} / {meta.pages}</span>
        <button disabled={page >= meta.pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-accent transition-colors">{isRtl ? '‹' : '›'}</button>
      </div>
    </div>
  );
}
