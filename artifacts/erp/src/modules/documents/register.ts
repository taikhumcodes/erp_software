import { DocumentRegistry } from './registry/DocumentRegistry';
import { PurchaseOrderTemplate } from './templates/purchase-order/Template';
import { DeliveryOrderTemplate } from './templates/delivery-order/Template';
import { SalesInvoiceTemplate } from './templates/sales-invoice/Template';

export function registerDocuments() {
  DocumentRegistry.register({
    type: 'PURCHASE_ORDER',
    displayName: 'Purchase Order',
    route: '/documents/purchase-order',
    templateComponent: PurchaseOrderTemplate,
    supportedActions: ['PREVIEW', 'PRINT', 'PDF']
  });

  DocumentRegistry.register({
    type: 'DELIVERY_ORDER',
    displayName: 'Delivery Order',
    route: '/documents/delivery-order',
    templateComponent: DeliveryOrderTemplate,
    supportedActions: ['PREVIEW', 'PRINT', 'PDF']
  });

  DocumentRegistry.register({
    type: 'SALES_INVOICE',
    displayName: 'Sales Invoice',
    route: '/documents/sales-invoice',
    templateComponent: SalesInvoiceTemplate,
    supportedActions: ['PREVIEW', 'PRINT', 'PDF']
  });
}
