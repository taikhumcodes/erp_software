const fs = require('fs');
let code = fs.readFileSync('src/pages/delivery-orders/CreateDeliveryOrder.tsx', 'utf8');

code = code.replace(/orderedQuantity: '1',\n  deliveredQuantity: '1'/g, "deliveredQuantity: '1'");
code = code.replace(/<TableHead>{t\('do_item_ordered'\)} \*<\/TableHead>\n.*<TableHead>{t\('do_item_delivered'\)} \*<\/TableHead>/, "<TableHead>{t('do_item_qty')} *</TableHead>");
code = code.replace(/<TableCell>\n.*value={item\.orderedQuantity}.*\n.*<\/TableCell>\n.*<TableCell>\n.*value={item\.deliveredQuantity}/, "<TableCell>\n                      <Input type=\"number\" min=\"0\" step=\"0.001\" value={item.deliveredQuantity}");

fs.writeFileSync('src/pages/delivery-orders/CreateDeliveryOrder.tsx', code);
console.log('Fixed Create DO UI');
