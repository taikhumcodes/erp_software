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

function fmtStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export class QuotationAdapter {
  adapt(apiData: any): Omit<DocumentData, 'company'> {
    const items = apiData.items || [];

    const subtotal = safeNumber(apiData.totalAmount);
    const discount = safeNumber(apiData.discount);
    const roundOff = safeNumber(apiData.roundOff);
    const grandTotal = safeNumber(apiData.grandTotal) || (subtotal - discount - roundOff);

    const qrData = `QUOTE-QR-${apiData.number || '000'}-${grandTotal}`;

    const leftInfoFields: DocumentInfo[] = [];
    leftInfoFields.push(
      { label: 'Quotation No.', labelAr: 'رقم عرض السعر', value: apiData.number || '—' },
      { label: 'Date', labelAr: 'التاريخ', value: fmtDate(apiData.quotationDate) },
      { label: 'Validity Date', labelAr: 'تاريخ الصلاحية', value: fmtDate(apiData.validityDate) },
      { label: 'Status', labelAr: 'الحالة', value: fmtStatus(apiData.status) },
      { label: 'Reference No.', labelAr: 'رقم المرجع', value: apiData.referenceNumber || '—' },
      { label: 'Credit Limit (KWD)', labelAr: 'الحد الائتماني', value: apiData.creditLimit ? fmtCurrency(apiData.creditLimit) : '0.000' }
    );

    const counterpartyInfo: CounterpartyInfo = {
      title: 'Quotation To',
      titleAr: 'عرض السعر إلى',
      name: apiData.customerName || apiData.customer?.name || '—',
      nameAr: apiData.customerNameAr || apiData.customer?.nameAr || '',
      fields: [
        { label: 'Address', labelAr: 'العنوان', value: apiData.address || apiData.customer?.address || '—' },
        { label: 'Mobile No.', labelAr: 'رقم الجوال', value: apiData.phone || apiData.customer?.phone || '—' },
        { label: 'Contact Person', labelAr: 'مسؤول التواصل', value: apiData.contactPerson || '—' },
      ],
    };

    const issuerInfo: CounterpartyInfo = {
      title: 'Quotation By',
      titleAr: 'مقدم عرض السعر',
      name: apiData.quotationBy || apiData.user?.name || '—',
      nameAr: apiData.quotationByAr || '',
      fields: []
    };
    if (apiData.quotationByAddress) {
      issuerInfo.fields.push({ label: 'Our Address', labelAr: 'العنوان', value: apiData.quotationByAddress });
    }

    return {
      type: 'QUOTATION',
      title: 'QUOTATION',
      titleAr: 'عــرض ســعــر',
      documentNumber: apiData.number || '—',
      date: fmtDate(apiData.quotationDate),

      leftInfoFields,
      counterpartyInfo,
      issuerInfo,

      columns: [
        { key: 'index', label: '#', labelAr: 'م', width: '5%', align: 'center' },
        { key: 'itemCode', label: 'Item Code', labelAr: 'رمز الصنف', width: '13%' },
        { key: 'description', label: 'Description', labelAr: 'البيان', width: '24%' },
        { key: 'countryOfOrigin', label: 'Origin', labelAr: 'المنشأ', width: '8%', align: 'center' },
        { key: 'unit', label: 'Unit', labelAr: 'الوحدة', width: '6%', align: 'center' },
        { key: 'qty', label: 'Qty', labelAr: 'الكمية', width: '6%', align: 'center' },
        { key: 'unitPrice', label: 'Unit Price', labelAr: 'سعر الوحدة', width: '14%', align: 'right', format: 'currency' },
        { key: 'totalPrice', label: 'Total Price', labelAr: 'الإجمالي', width: '14%', align: 'right', format: 'currency' },
      ],

      items: items.map((item: any, idx: number) => ({
        index: idx + 1,
        itemCode: item.product?.sku || '—',
        description: item.description || item.product?.name || '—',
        descriptionAr: item.product?.nameAr || '',
        countryOfOrigin: item.countryOfOrigin || item.product?.countryOfOrigin || '—',
        unit: item.product?.unit?.abbreviation || 'PCS',
        unitAr: item.product?.unit?.nameAr || 'قطعة',
        qty: safeNumber(item.quantity),
        unitPrice: fmtCurrency(item.unitPrice),
        totalPrice: fmtCurrency(safeNumber(item.quantity) * safeNumber(item.unitPrice)),
      })),

      summaryLines: [
        { label: 'Subtotal', labelAr: 'المجموع الفرعي', value: fmtCurrency(subtotal) },
        { label: 'Discount', labelAr: 'الخصم', value: fmtCurrency(discount) },
        { label: 'Round Off', labelAr: 'تقريب', value: fmtCurrency(roundOff) },
        { label: 'Grand Total', labelAr: 'الإجمالي', value: `${fmtCurrency(grandTotal)} KWD`, isBold: true, hasBorderTop: true, isHighlighted: true },
      ],

      amountInWords: numberToWords(grandTotal, 'English'),
      amountInWordsAr: numberToWords(grandTotal, 'Arabic'),

      signatures: [
        { title: 'Prepared By', titleAr: 'أعد بواسطة', name: apiData.quotationBy || apiData.user?.name || '' },
        { title: 'Salesperson', titleAr: 'مندوب المبيعات', name: apiData.salesperson?.name || '' },
      ],
      notes: apiData.notes || undefined,
      terms: apiData.termsAndConditions || undefined,
      qrData,
      infoFields: leftInfoFields,
    };
  }
}
