const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

const emptyForm = () => ({
  deliveryOrderId: '',
  customerId: '',
  saleDate: new Date().toISOString().slice(0, 10),
  status: 'DRAFT',
  discount: '0',
  notes: '',
  items: [{ key: 'init', productId: '', quantity: '1', unitPrice: '' }],
});

const formDialogRegex = /function SaleFormDialog.*?return \(\s*<Dialog open=\{open\} onOpenChange=\{onOpenChange\}>.*?<\/Dialog>\s*\);\s*\}/s;

const newFormDialog = `function SaleFormDialog({
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

  const customersQuery = useQuery({ queryKey: ['customers-list'], queryFn: fetchCustomers, enabled: open });
  const productsQuery  = useQuery({ queryKey: ['products-list'], queryFn: fetchProducts, enabled: open });
  const saleQuery      = useQuery({ queryKey: ['sale', saleId], queryFn: () => fetchSale(saleId!), enabled: isEdit && open });
  const doQuery        = useQuery({ queryKey: ['dos-for-invoice'], queryFn: () => api.get<any>('/api/delivery-orders?limit=100&invoiceStatus=NOT_INVOICED&status=DISPATCHED'), enabled: open && !isEdit });

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
      const res = await api.get<any>(\`/api/delivery-orders/\${doId}\`);
      const d = res.data.data;
      setForm((prev: any) => ({
        ...prev,
        deliveryOrderId: d.id,
        customerId: d.customerId,
        items: d.items.map((i: any) => ({
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
                      {doQuery.data?.data?.data?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.number} - {d.customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-customer">{t('sale_customer')} <span className="text-destructive">*</span></Label>
                <Select value={form.customerId} onValueChange={v => setForm((prev: any) => ({ ...prev, customerId: v }))} disabled={isPending || !!form.deliveryOrderId}>
                  <SelectTrigger id="p-customer"><SelectValue placeholder={t('sale_select_customer')} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                              <SelectTrigger className={errors[\`items.\${i}.productId\`] ? 'border-destructive' : ''}><SelectValue placeholder={t('sale_select_product')} /></SelectTrigger>
                              <SelectContent>{products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>)}</SelectContent>
                            </Select>
                            {errors[\`items.\${i}.productId\`] && <p className="text-xs text-destructive mt-1">{errors[\`items.\${i}.productId\`]}</p>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.001" value={item.quantity} onChange={e => updateItem(item.key, 'quantity', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} className={errors[\`items.\${i}.quantity\`] ? 'border-destructive' : ''} />
                            {errors[\`items.\${i}.quantity\`] && <p className="text-xs text-destructive mt-1">{errors[\`items.\${i}.quantity\`]}</p>}
                          </TableCell>
                          <TableCell>
                            <Input type="number" min="0" step="0.001" value={item.unitPrice} onChange={e => updateItem(item.key, 'unitPrice', e.target.value)} onFocus={e => e.target.select()} disabled={isPending} className={errors[\`items.\${i}.unitPrice\`] ? 'border-destructive' : ''} />
                            {errors[\`items.\${i}.unitPrice\`] && <p className="text-xs text-destructive mt-1">{errors[\`items.\${i}.unitPrice\`]}</p>}
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
    </Dialog>
  );
}`;

// Re-write using regex replace or replace with the end index
const startIndex = code.indexOf('function SaleFormDialog');
const endIndex = code.indexOf('export default function SalesPage');

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find boundaries');
  process.exit(1);
}

const newCode = code.substring(0, startIndex) + newFormDialog + '\n\n// ─── Sales page ───────────────────────────────────────────────────────────\n\n' + code.substring(endIndex);
fs.writeFileSync('src/pages/sales.tsx', newCode);
console.log('Fixed SaleFormDialog!');
