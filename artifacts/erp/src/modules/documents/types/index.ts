export interface CompanyProfile {
  logoUrl?: string;
  qrCodeUrl?: string;
  nameEn: string;
  nameAr: string;
  commercialRegistration?: string;
  companyRegistration?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  whatsapp?: string;
  addressEn?: string;
  addressAr?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  watermarkUrl?: string;
  currency: string;
  dateFormat: string;
  decimalPrecision: number;
  paperSize: 'A4' | 'Letter';
  defaultLanguage: 'en' | 'ar';
  bilingual: boolean;
  termsEn?: string;
  termsAr?: string;
  preparedByLabel: string;
  checkedByLabel: string;
  approvedByLabel: string;
  receivedByLabel: string;
}

export type DocumentType = 'PURCHASE_ORDER' | 'DELIVERY_ORDER' | 'SALES_INVOICE' | 'QUOTATION' | 'RECEIPT' | 'PAYMENT_VOUCHER' | 'GOODS_RETURN' | 'PURCHASE_RETURN' | 'CREDIT_NOTE' | 'DEBIT_NOTE';

/**
 * A key-value pair for the left/right info columns.
 * label = English, labelAr = Arabic, value = the data
 */
export interface DocumentInfo {
  label: string;
  labelAr: string;
  value: string;
}

/**
 * Counterparty info block (shown in center column).
 * Used for Customer (SI/DO) or Supplier (PO).
 */
export interface CounterpartyInfo {
  title: string;       // "Customer" or "Supplier"
  titleAr: string;     // "العميل" or "المورد"
  name: string;
  nameAr?: string;
  fields: DocumentInfo[]; // Mobile No, Contact Person, Project/Site, Delivery Address, etc.
}

/**
 * Delivery details card for the delivery order grid.
 */
export interface DeliveryDetailCard {
  icon: string;        // lucide icon name (e.g. 'map-pin', 'building', 'calendar', 'phone', 'user', 'message-square', 'truck', 'car')
  label: string;       // English label
  labelAr?: string;    // Arabic label
  value: string;
}

export interface DocumentColumn {
  key: string;
  label: string;
  labelAr: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  format?: 'number' | 'currency' | 'text' | 'date';
}

export type DocumentItem = Record<string, string | number | null | undefined>;

export interface DocumentSummaryLine {
  label: string;
  labelAr: string;
  value: string;
  isBold?: boolean;
  isNegative?: boolean;
  hasBorderTop?: boolean;
  isHighlighted?: boolean; // Gold/accent background for Grand Total
}

export interface SignatureSlot {
  title: string;
  titleAr: string;
  name?: string;
  date?: string;
  isReceiver?: boolean; // For "For Receiving Use" style with Received By / Signature / Date
}

export interface DocumentData {
  type: DocumentType;
  title: string;
  titleAr: string;
  documentNumber: string;
  date: string;
  company: CompanyProfile;

  /** Left-column info fields (English labels + values) */
  leftInfoFields: DocumentInfo[];

  /** Counterparty info (Customer or Supplier — center column) */
  counterpartyInfo: CounterpartyInfo;

  /** Issuer info (Quotation By / From) */
  issuerInfo?: CounterpartyInfo;

  /** Delivery details cards (Delivery Order only) */
  deliveryDetails?: DeliveryDetailCard[];

  /** Items table */
  columns: DocumentColumn[];
  items: DocumentItem[];

  /** Summary footer row for DO (Total Items / Total Quantity) */
  itemsSummary?: { totalItems: number; totalQuantity: number };

  /** Financial totals */
  summaryLines: DocumentSummaryLine[];

  /** Amount in words */
  amountInWords?: string;
  amountInWordsAr?: string;

  /** Notes section (Delivery Order) */
  notes?: string;
  notesAr?: string;

  /** Terms & conditions */
  terms?: string;
  termsAr?: string;

  /** Signature slots */
  signatures: SignatureSlot[];

  currency?: string;
  qrData?: string;

  // Legacy compat — kept for any old code that reads these
  infoFields?: DocumentInfo[];
}
