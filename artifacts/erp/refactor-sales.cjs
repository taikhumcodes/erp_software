const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

code = code.replace(
  `  const productsQuery = useQuery({`,
  `  const doQuery = useQuery({
    queryKey: ['dos-for-invoice'],
    queryFn: () => api.get<any>('/api/delivery-orders?limit=100&invoiceStatus=NOT_INVOICED&status=DELIVERED'),
    enabled: open && !isEdit,
  });

  const productsQuery = useQuery({`
);

code = code.replace(
  `  const products  = productsQuery.data?.data ?? [];`,
  `  const products  = productsQuery.data?.data ?? [];
  const dos = doQuery.data?.data || [];`
);

code = code.replace(
  `  // Populate form on edit`,
  `  // Populate form when DO is selected
  const handleDOSelect = async (doId: string) => {
    if (doId === 'NONE') {
      setForm(prev => ({ ...prev, deliveryOrderId: '', customerId: '', items: [emptyItem()] }));
      return;
    }
    const res = await api.get<any>(\`/api/delivery-orders/\${doId}\`);
    const d = res.data;
    setForm(prev => ({
      ...prev,
      deliveryOrderId: d.id,
      customerId: d.customerId,
      items: d.items.filter((i: any) => parseFloat(i.deliveredQuantity) > 0).map((i: any) => ({
        key: nextKey(),
        productId: i.productId,
        quantity: i.deliveredQuantity,
        unitPrice: productMap.get(i.productId)?.sellingPrice ?? '0.000'
      }))
    }));
  };

  // Populate form on edit`
);

code = code.replace(
  `        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`,
  `        {!isEdit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>{t('do_select_optional', 'Select Delivery Order (Optional)')}</Label>
              <Select value={form.deliveryOrderId || 'NONE'} onValueChange={handleDOSelect}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_do', 'Direct Invoice (No DO)')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Direct Invoice (No DO)</SelectItem>
                  {dos.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.number} - {d.customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`
);

code = code.replace(
  `            <div className="space-y-2">
              <Label>{t('sale_customer')} *</Label>
              <Select`,
  `            <div className="space-y-2">
              <Label>{t('sale_customer')} *</Label>
              <Select disabled={!!form.deliveryOrderId}`
);

code = code.replace(
  `      customerId:   form.customerId,`,
  `      deliveryOrderId: form.deliveryOrderId || undefined,
      customerId:   form.customerId,`
);

code = code.replace(
  `        customerId: p.customerId,`,
  `        deliveryOrderId: p.deliveryOrderId || '',
        customerId: p.customerId,`
);

fs.writeFileSync('src/pages/sales.tsx', code);
console.log('sales.tsx refactored');
