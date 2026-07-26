import { DocumentData, DocumentInfo, CounterpartyInfo, DeliveryDetailCard } from '../types';

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

function fmtMethod(method: string | null | undefined): string {
  if (!method || method === 'NONE') return '—';
  return method.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export function adaptDeliveryOrder(apiData: any): Omit<DocumentData, 'company'> {
  const items = apiData.items || [];

  const totalQty = items.reduce((sum: number, item: any) => sum + safeNumber(item.quantity), 0);
  const qrData = `DO-QR-${apiData.number || '000'}`;

  const leftInfoFields: DocumentInfo[] = [
    { label: 'Delivery Order No.', labelAr: 'رقم أمر التسليم', value: apiData.number || '—' },
    { label: 'Internal SO No.', labelAr: 'الرقم الداخلي', value: apiData.internalSONumber || '—' },
    { label: 'Customer PO No.', labelAr: 'رقم طلب الشراء', value: apiData.customerPONumber || '—' },
    { label: 'Order Type', labelAr: 'نوع الطلب', value: apiData.orderType === 'CUSTOMER_PO' ? 'CORPORATE' : 'DIRECT' },
    { label: 'Delivery Date', labelAr: 'تاريخ التسليم', value: fmtDate(apiData.deliveryDate || apiData.createdAt) },
    { label: 'Payment Method', labelAr: 'طريقة الدفع', value: fmtMethod(apiData.paymentMethod) },
  ];

  const counterpartyInfo: CounterpartyInfo = {
    title: 'Customer',
    titleAr: 'العميل',
    name: apiData.customer?.name || apiData.customerNameSnapshot || '—',
    nameAr: apiData.customer?.nameAr || '',
    fields: [
      { label: 'Mobile No.', labelAr: 'رقم الجوال', value: apiData.contactNumber || apiData.customer?.phone || '—' },
      { label: 'Contact Person', labelAr: 'الشخص المسؤول', value: apiData.contactPerson || '—' },
    ],
  };

  // Delivery details grid cards
  const deliveryDetails: DeliveryDetailCard[] = [
    { icon: 'map-pin', label: 'Delivery Address', labelAr: 'عنوان التسليم', value: apiData.deliveryAddress || apiData.customer?.address || '—' },
    { icon: 'building', label: 'Project / Site', labelAr: 'المشروع / الموقع', value: apiData.site || '—' },
    { icon: 'calendar', label: 'Expected Delivery Date', labelAr: 'تاريخ التسليم المتوقع', value: fmtDate(apiData.deliveryDate) },
    { icon: 'phone', label: 'Contact Number', labelAr: 'رقم التواصل', value: apiData.contactNumber || '—' },
    { icon: 'user', label: 'Contact Person', labelAr: 'الشخص المسؤول', value: apiData.contactPerson || '—' },
    { icon: 'message-square', label: 'Remarks', labelAr: 'ملاحظات', value: apiData.notes || '—' },
    { icon: 'truck', label: 'Driver Name', labelAr: 'اسم السائق', value: apiData.driverName || '—' },
    { icon: 'car', label: 'Vehicle Number', labelAr: 'رقم المركبة', value: apiData.vehicleNumber || '—' },
    { icon: 'file-text', label: 'Internal Notes', labelAr: 'ملاحظات داخلية', value: apiData.internalNotes || 'N/A' },
  ];

  return {
    type: 'DELIVERY_ORDER',
    title: 'DELIVERY ORDER',
    titleAr: 'أمر تسليم',
    documentNumber: apiData.number || '—',
    date: fmtDate(apiData.deliveryDate || apiData.createdAt),

    leftInfoFields,
    counterpartyInfo,
    deliveryDetails,

    columns: [
      { key: 'index', label: '#', labelAr: 'م', width: '5%', align: 'center' },
      { key: 'itemCode', label: 'Item Code', labelAr: 'رمز الصنف', width: '13%' },
      { key: 'description', label: 'Description', labelAr: 'البيان', width: '32%' },
      { key: 'unit', label: 'Unit', labelAr: 'الوحدة', width: '8%', align: 'center' },
      { key: 'qty', label: 'Qty', labelAr: 'الكمية', width: '8%', align: 'center' },
      { key: 'stockAvailable', label: 'Stock Available', labelAr: 'المتوفر بالمخزن', width: '14%', align: 'center' },
      { key: 'remarks', label: 'Remarks', labelAr: 'ملاحظات', width: '16%' },
    ],

    items: items.map((item: any, idx: number) => ({
      index: idx + 1,
      itemCode: item.product?.sku || item.productCodeSnapshot || '—',
      description: item.product?.name || item.productNameSnapshot || '—',
      descriptionAr: item.product?.nameAr || '',
      unit: item.product?.unit?.abbreviation || item.unitSnapshot || 'PCS',
      unitAr: item.product?.unit?.nameAr || '',
      qty: safeNumber(item.quantity),
      stockAvailable: safeNumber(item.product?.stockQuantity || 0),
      remarks: item.remarks || '-',
    })),

    itemsSummary: {
      totalItems: items.length,
      totalQuantity: totalQty,
    },

    summaryLines: [], // No financial totals for delivery order

    notes: apiData.notes || '',
    notesAr: '',

    signatures: [
      { title: 'Prepared By', titleAr: 'أعد بواسطة', name: apiData.createdBy?.name || '', date: fmtDate(apiData.createdAt) },
      { title: 'Checked By', titleAr: 'تم الفحص بواسطة', name: '', date: fmtDate(apiData.createdAt) },
      { title: 'For Receiving Use /', titleAr: 'للاستلام', isReceiver: true },
    ],

    qrData,
    infoFields: leftInfoFields,
  };
}
