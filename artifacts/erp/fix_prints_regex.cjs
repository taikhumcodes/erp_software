const fs = require('fs');

function replaceButtons(path, entity) {
  let code = fs.readFileSync(path, 'utf8');
  
  // Replace PDF export
  const pdfRegex = /toast\(\{ title: t\('([^']+)_export_pdf'\), description: t\('coming_soon'\) \}\);/g;
  code = code.replace(pdfRegex, `window.open('/documents/${entity}/' + ${entity === 'sales-invoice' ? 'sale' : 'purchase'}.id, '_blank');`);
                      
  // Replace print
  const printRegex = /window\.print\(\)/g;
  code = code.replace(printRegex, `window.open('/documents/${entity}/' + ${entity === 'sales-invoice' ? 'sale' : 'purchase'}.id + '?print=true', '_blank')`);

  fs.writeFileSync(path, code);
  console.log(path + ' updated');
}

replaceButtons('src/pages/sales.tsx', 'sales-invoice');
replaceButtons('src/pages/purchases.tsx', 'purchase-order');

const doPath = 'src/pages/delivery-orders/DeliveryOrderDetails.tsx';
let doCode = fs.readFileSync(doPath, 'utf8');
doCode = doCode.replace(/window\.print\(\)/g, "window.open('/documents/delivery-order/' + deliveryOrder.id + '?print=true', '_blank')");

// Add PDF export next to print
const targetDOBtn = `<Printer className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>`;
const replaceDOBtn = `<Printer className="mr-2 h-4 w-4" />
            {t('print')}
          </Button>
          <Button variant="outline" onClick={() => window.open('/documents/delivery-order/' + deliveryOrder.id, '_blank')}>
            <FileText className="mr-2 h-4 w-4" />
            {t('purchase_export_pdf')}
          </Button>`;

doCode = doCode.replace(targetDOBtn, replaceDOBtn);
fs.writeFileSync(doPath, doCode);
console.log('DeliveryOrderDetails updated');
