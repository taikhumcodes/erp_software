import { DocumentData, DocumentInfo, CounterpartyInfo } from '../types';
import { numberToWords } from '../utils/numberToWords';

function safeNumber(val: any): number {
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function fmtDate(dateString: any): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtCurrency(val: any): string {
  return safeNumber(val).toFixed(3);
}

function fmtMethod(method: string | null | undefined): string {
  if (!method || method === 'NONE') return '—';
  return method.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function fmtStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function adaptSalesInvoice(apiData: any): Omit<DocumentData, 'company'> {
  const items = apiData.items || [];

  const subtotal = items.reduce((sum: number, item: any) =>
    sum + (safeNumber(item.quantity) * safeNumber(item.unitPrice)), 0);
  const discount = safeNumber(apiData.discount);
  const grandTotal = safeNumber(apiData.netAmount) || (subtotal - discount);

  const qrData = `ZATCA-QR-${apiData.number || '000'}-${grandTotal}`;

  // Left column: document detail fields
  const leftInfoFields: DocumentInfo[] = [
    { label: 'Invoice No.', labelAr: 'رقم الفاتورة', value: apiData.number || '—' },
    { label: 'Internal SO No.', labelAr: 'الرقم الداخلي (SO)', value: apiData.internalSONumber || '—' },
    { label: 'Delivery Order No.', labelAr: 'رقم أمر التسليم', value: apiData.deliveryOrder?.number || '—' },
    { label: 'Customer PO No.', labelAr: 'رقم طلب الشراء', value: apiData.customerPONumber || '—' },
    { label: 'Invoice Date', labelAr: 'تاريخ الفاتورة', value: fmtDate(apiData.saleDate || apiData.createdAt) },
    { label: 'Status', labelAr: 'الحالة', value: fmtStatus(apiData.status) },
    { label: 'Payment Method', labelAr: 'طريقة الدفع', value: fmtMethod(apiData.paymentMethod) },
    { label: 'Payment Status', labelAr: 'حالة الدفع', value: fmtStatus(apiData.paymentStatus) },
  ];

  // Center: Customer info
  const counterpartyInfo: CounterpartyInfo = {
    title: 'Customer',
    titleAr: 'العميل',
    name: apiData.customer?.name || '—',
    nameAr: apiData.customer?.nameAr || '',
    fields: [
      { label: 'Mobile No.', labelAr: 'رقم الجوال', value: apiData.customer?.phone || '—' },
      { label: 'Contact Person', labelAr: 'الشخص المسؤول', value: apiData.contactPerson || '—' },
      { label: 'Project / Site', labelAr: 'المشروع / الموقع', value: apiData.site || apiData.project || '—' },
      { label: 'Delivery Address', labelAr: 'عنوان التسليم', value: apiData.deliveryAddress || apiData.customer?.address || '—' },
    ],
  };

  return {
    type: 'SALES_INVOICE',
    title: 'SALES INVOICE',
    titleAr: 'فاتورة مبيعات',
    documentNumber: apiData.number || '—',
    date: fmtDate(apiData.saleDate || apiData.createdAt),

    leftInfoFields,
    counterpartyInfo,

    columns: [
      { key: 'index', label: '#', labelAr: 'م', width: '4%', align: 'center' },
      { key: 'itemCode', label: 'Item Code', labelAr: 'رمز الصنف', width: '12%' },
      { key: 'description', label: 'Description', labelAr: 'البيان', width: '28%' },
      { key: 'unit', label: 'Unit', labelAr: 'الوحدة', width: '7%', align: 'center' },
      { key: 'qty', label: 'Qty', labelAr: 'الكمية', width: '7%', align: 'center' },
      { key: 'unitPrice', label: 'Unit Price\n(KWD)', labelAr: 'سعر الوحدة', width: '14%', align: 'right', format: 'currency' },
      { key: 'discount', label: 'Discount', labelAr: 'الخصم', width: '10%', align: 'right', format: 'currency' },
      { key: 'totalPrice', label: 'Total Price\n(KWD)', labelAr: 'الإجمالي', width: '14%', align: 'right', format: 'currency' },
    ],

    items: items.map((item: any, idx: number) => ({
      index: idx + 1,
      itemCode: item.product?.sku || '—',
      description: item.product?.name || item.productName || '—',
      descriptionAr: item.product?.nameAr || '',
      unit: item.product?.unit?.abbreviation || 'PCS',
      unitAr: item.product?.unit?.nameAr || 'قطعة',
      qty: safeNumber(item.quantity),
      unitPrice: fmtCurrency(item.unitPrice),
      discount: fmtCurrency(0),
      totalPrice: fmtCurrency(safeNumber(item.quantity) * safeNumber(item.unitPrice)),
    })),

    summaryLines: [
      { label: 'Subtotal', labelAr: 'المجموع الفرعي', value: fmtCurrency(subtotal) },
      { label: 'Discount', labelAr: 'الخصم', value: fmtCurrency(discount) },
      { label: 'Additional Charges', labelAr: 'رسوم إضافية', value: fmtCurrency(0) },
      { label: 'Grand Total', labelAr: 'الإجمالي', value: `${fmtCurrency(grandTotal)} KWD`, isBold: true, hasBorderTop: true, isHighlighted: true },
      ...(safeNumber(apiData.paidAmount) > 0 ? [
        { label: 'Paid Amount', labelAr: 'المبلغ المدفوع', value: fmtCurrency(apiData.paidAmount) },
        { label: 'Remaining Balance', labelAr: 'المبلغ المتبقي', value: fmtCurrency(grandTotal - safeNumber(apiData.paidAmount)) },
      ] : []),
    ],

    amountInWords: numberToWords(grandTotal, 'English'),
    amountInWordsAr: numberToWords(grandTotal, 'Arabic'),

    signatures: [
      { title: 'Prepared By', titleAr: 'أعد بواسطة', name: apiData.user?.name || '', date: fmtDate(apiData.saleDate || apiData.createdAt) },
      { title: 'Checked By', titleAr: 'تم الفحص بواسطة', name: '', date: fmtDate(apiData.saleDate || apiData.createdAt) },
      { title: 'For Receiving Use /', titleAr: 'للاستلام', isReceiver: true },
    ],

    qrData,

    // Legacy compat
    infoFields: leftInfoFields,
  };
}
