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


export function adaptPurchaseOrder(apiData: any): Omit<DocumentData, 'company'> {
  const items = apiData.items || [];

  const subtotal = items.reduce((sum: number, item: any) =>
    sum + (safeNumber(item.quantity) * safeNumber(item.unitPrice)), 0);
  const discount = safeNumber(apiData.discount);
  const grandTotal = safeNumber(apiData.netAmount) || safeNumber(apiData.totalAmount) || (subtotal - discount);

  const qrData = `PO-QR-${apiData.number || '000'}-${grandTotal}`;

  const leftInfoFields: DocumentInfo[] = [
    { label: 'Purchase No.', labelAr: 'رقم أمر الشراء', value: apiData.number || '—' },
    { label: 'Date', labelAr: 'التاريخ', value: fmtDate(apiData.purchaseDate) },
    { label: 'Status', labelAr: 'الحالة', value: fmtStatus(apiData.status) },
    { label: 'Payment Method', labelAr: 'طريقة الدفع', value: fmtMethod(apiData.paymentMethod) },
    { label: 'Payment Status', labelAr: 'حالة الدفع', value: fmtStatus(apiData.paymentStatus) },
  ];

  const counterpartyInfo: CounterpartyInfo = {
    title: 'Supplier',
    titleAr: 'المورد',
    name: apiData.supplier?.name || '—',
    nameAr: apiData.supplier?.nameAr || '',
    fields: [
      { label: 'Mobile No.', labelAr: 'رقم الجوال', value: apiData.supplier?.phone || '—' },
      { label: 'Supplier Bill No.', labelAr: 'رقم فاتورة المورد', value: apiData.supplierBillNo || '—' },
    ],
  };

  return {
    type: 'PURCHASE_ORDER',
    title: 'PURCHASE ORDER',
    titleAr: 'أمــر شــراء',
    documentNumber: apiData.number || '—',
    date: fmtDate(apiData.purchaseDate),

    leftInfoFields,
    counterpartyInfo,

    columns: [
      { key: 'index', label: '#', labelAr: 'م', width: '5%', align: 'center' },
      { key: 'itemCode', label: 'Item Code', labelAr: 'رمز الصنف', width: '13%' },
      { key: 'description', label: 'Description', labelAr: 'البيان', width: '32%' },
      { key: 'unit', label: 'Unit', labelAr: 'الوحدة', width: '8%', align: 'center' },
      { key: 'qty', label: 'Qty', labelAr: 'الكمية', width: '8%', align: 'center' },
      { key: 'unitPrice', label: 'Unit Price', labelAr: 'سعر الوحدة', width: '15%', align: 'right', format: 'currency' },
      { key: 'totalPrice', label: 'Total Price', labelAr: 'الإجمالي', width: '15%', align: 'right', format: 'currency' },
    ],

    items: items.map((item: any, idx: number) => ({
      index: idx + 1,
      itemCode: item.product?.sku || '—',
      description: item.product?.name || '—',
      descriptionAr: item.product?.nameAr || '',
      unit: item.product?.unit?.abbreviation || 'PCS',
      unitAr: item.product?.unit?.nameAr || 'قطعة',
      qty: safeNumber(item.quantity),
      unitPrice: fmtCurrency(item.unitPrice),
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
      { title: 'Prepared By', titleAr: 'أعد بواسطة', name: apiData.user?.name || '' },
      { title: 'Checked By', titleAr: 'تم الفحص بواسطة', name: '' },
    ],

    qrData,
    infoFields: leftInfoFields,
  };
}
