const fs = require('fs');

try {
  const salesPath = 'src/pages/sales.tsx';
  let salesCode = fs.readFileSync(salesPath, 'utf8');

  const targetSales = `<DropdownMenuItem onClick={() => {
                              toast({ title: t('sale_export_pdf'), description: t('coming_soon') });
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

                            <DropdownMenuItem onClick={() => window.print()}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t('print')}
                            </DropdownMenuItem>`;

  const replacementSales = `<DropdownMenuItem onClick={() => {
                              window.open(\`/documents/sales-invoice/\${sale.id}\`, '_blank');
                            }}>
                              <FileText className="mr-2 h-4 w-4" />
                              {t('sale_export_pdf')}
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                              window.open(\`/documents/sales-invoice/\${sale.id}?print=true\`, '_blank');
                            }}>
                              <Printer className="mr-2 h-4 w-4" />
                              {t('print')}
                            </DropdownMenuItem>`;

  if (salesCode.includes(targetSales)) {
    salesCode = salesCode.replace(targetSales, replacementSales);
    fs.writeFileSync(salesPath, salesCode);
    console.log('sales.tsx updated');
  }

  const doPath = 'src/pages/delivery-orders/DeliveryOrderDetails.tsx';
  if (fs.existsSync(doPath)) {
    let doCode = fs.readFileSync(doPath, 'utf8');
    const targetDO = `<Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>`;

    const replacementDO = `<Button variant="outline" onClick={() => window.open(\`/documents/delivery-order/\${deliveryOrder.id}?print=true\`, '_blank')}>
            <Printer className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>
          <Button variant="outline" onClick={() => window.open(\`/documents/delivery-order/\${deliveryOrder.id}\`, '_blank')}>
            <FileText className="mr-2 h-4 w-4" />
            {t('export_pdf')}
          </Button>`;

    if (doCode.includes(targetDO)) {
      doCode = doCode.replace(targetDO, replacementDO);
      fs.writeFileSync(doPath, doCode);
      console.log('DeliveryOrderDetails.tsx updated');
    }
  }
} catch (e) {
  console.error(e);
}
