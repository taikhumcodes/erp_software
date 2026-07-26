const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

const replacement = `  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(p => map.set(p.id, p));
    return map;
  }, [products]);

  const updateItem = (key: string, field: keyof SaleItemForm, value: string) => {
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

  const handleProductSelect = (key: string, productId: string) => {
    const prod = productMap.get(productId);
    setForm(prev => ({
      ...prev,
      items: prev.items.map(it =>
        it.key === key
          ? { ...it, productId, unitPrice: prod?.sellingPrice ?? '0.000' }
          : it
      ),
    }));
  };

  const subtotal = useMemo(() => {
    return form.items.reduce((sum, it) => {
      return sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    }, 0);
  }, [form.items]);

  const grandTotal = useMemo(() => {
    return subtotal - (Number(form.discount) || 0);
  }, [subtotal, form.discount]);

  const applyFieldErrors = (
    raw: { field: string; message: string }[] | undefined,
  ) => {
    if (!raw?.length) return false;
    const fe: any = {};
    raw.forEach(({ field: f, message: m }) => { fe[f] = m; });
    setErrors(fe);
    return true;
  };

  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      toast({ title: t('sale_created') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => updateSale(saleId!, body),
    onSuccess: () => {
      toast({ title: t('sale_updated') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const fe: any = {};
    if (!form.customerId) fe.customerId = 'Customer is required';
    if (!form.items.length || form.items.every(it => !it.productId)) {
      fe.items = t('sale_no_items');
    }
    if (Object.keys(fe).length) { setErrors(fe); return; }

    const body: Record<string, unknown> = {
      deliveryOrderId: form.deliveryOrderId || undefined,
      customerId:   form.customerId,
      saleDate: form.saleDate,
      status:       form.status,
      discount:     form.discount,
      notes:        form.notes || undefined,
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

  const isDataLoading = customersQuery.isLoading || productsQuery.isLoading || (isEdit && saleQuery.isLoading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('edit_sale') : t('add_sale')}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t('sale_edit_desc') : t('sale_add_desc')}
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
                <Label htmlFor="p-customer">
                  {t('sale_customer')} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.customerId}
                  onValueChange={v => setForm(prev => ({ ...prev, customerId: v }))}
                  disabled={isPending || !!form.deliveryOrderId}
                >
                  <SelectTrigger id="p-customer"><SelectValue placeholder={t('sale_select_customer')} /></SelectTrigger>
                  <SelectContent>
                    {customers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>`;

const target = `  const customers = customersQuery.data?.data ?? [];
  const products  = productsQuery.data?.data ?? [];
                    ))}
                  </SelectContent>
                </Select>`;

code = code.replace(target, replacement);

fs.writeFileSync('src/pages/sales.tsx', code);
console.log('Restored sales.tsx');
