// ─── Document System Types ────────────────────────────────────────────────────
// These types are module-agnostic. They define the structure of any printable
// document in the ERP without knowing about Purchases, Sales, or any other
// business domain.
// ──────────────────────────────────────────────────────────────────────────────

/** Company branding loaded from Company Profile (or temporary config). */
export interface CompanyProfile {
  logoUrl: string | null;
  nameEn: string;
  nameAr: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  commercialRegistration: string;
  vatTrn: string;
  footerMessage: string;
  footerMessageAr: string;
  qrCodeUrl: string | null;
  defaultCurrency: string;
}

/** Supported document types — extend this union for new modules. */
export type DocumentType = 'purchase' | 'sales' | 'delivery' | 'payment';

/** A single key-value pair shown in the Information Grid. */
export interface DocumentInfo {
  label: string;
  labelAr: string;
  value: string;
}

/** Column definition for the Product Table. */
export interface DocumentColumn {
  key: string;
  label: string;
  labelAr: string;
  align?: 'left' | 'center' | 'right';
  /** Optional formatting hint: 'number', 'currency', 'text' */
  format?: 'number' | 'currency' | 'text';
}

/** A single row in the Product Table. Keys match DocumentColumn.key. */
export type DocumentItem = Record<string, string | number>;

/** A single line in the Summary section (Subtotal, Discount, Tax, Total, etc.). */
export interface DocumentSummaryLine {
  label: string;
  labelAr: string;
  value: string;
  isBold?: boolean;
  isNegative?: boolean;
  hasBorderTop?: boolean;
}

/** A signature slot (Prepared By, Checked By, etc.). */
export interface SignatureSlot {
  title: string;
  titleAr: string;
  name?: string;
}

/**
 * The master document payload.
 * Business modules build this object and pass it to the Document Service.
 * Templates and components consume it — they never import business types.
 */
export interface DocumentData {
  /** Which template to render. */
  type: DocumentType;

  /** Document title (e.g. "Purchase Order", "Sales Invoice"). */
  title: string;
  titleAr: string;

  /** Document number (e.g. "PO-00042"). */
  documentNumber: string;

  /** Document date (formatted string). */
  date: string;

  /** Company branding. */
  company: CompanyProfile;

  /** Key-value info fields (Supplier, Date, Reference, etc.). */
  infoFields: DocumentInfo[];

  /** Product table column configuration. */
  columns: DocumentColumn[];

  /** Product table row data. */
  items: DocumentItem[];

  /** Summary / totals lines. */
  summaryLines: DocumentSummaryLine[];

  /** Total amount written in words (English). */
  amountInWords: string;

  /** Total amount written in words (Arabic). */
  amountInWordsAr: string;

  /** Terms & conditions (English). */
  terms: string;

  /** Terms & conditions (Arabic). */
  termsAr: string;

  /** Signature slots. */
  signatures: SignatureSlot[];

  /** Optional notes. */
  notes?: string;

  /** Currency code. */
  currency: string;
}
