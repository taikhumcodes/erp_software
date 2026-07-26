/**
 * Settings Module — Type Definitions
 *
 * Comprehensive TypeScript interfaces for all ERP settings.
 * These types are the contract between the Settings UI, SettingsService, and Document Engine.
 */

// ─── Company Profile ──────────────────────────────────────────────────────────

export interface CompanyProfileSettings {
  logoUrl?: string;
  nameEn: string;
  nameAr: string;
  tagline: string;
  commercialRegistration: string;
  companyRegistration: string;
  vatNumber: string;
  licenseNumber: string;
  phone: string;
  mobile: string;
  whatsapp: string;
  email: string;
  website: string;
  addressEn: string;
  addressAr: string;
  city: string;
  country: string;
  postalCode: string;
  timezone: string;
  defaultCurrency: string;
  defaultLanguage: 'en' | 'ar';
  bilingual: boolean;
}

// ─── Branding ─────────────────────────────────────────────────────────────────

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borderColor: string;
  textColor: string;
  headerBackground: string;
  footerBackground: string;
  tableHeaderColor: string;
  watermarkUrl?: string;
  watermarkOpacity: number;
  logoPosition: 'left' | 'center' | 'right';
  logoWidth: string;
  logoHeight: string;
  qrPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  qrSize: number;
  themeId: string;
}

// ─── Document Layout ──────────────────────────────────────────────────────────

export interface DocumentLayoutSettings {
  paperSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  marginTop: string;
  marginBottom: string;
  marginLeft: string;
  marginRight: string;
  documentWidth: string;
  contentWidth: string;
  bodyPadding: string;
  headerHeight: string;
  footerHeight: string;
  maxTableWidth: string;
  sectionGap: string;
  lineGap: string;
  paragraphGap: string;
}

// ─── Document Typography ──────────────────────────────────────────────────────

export interface DocumentTypographySettings {
  fontFamily: string;
  arabicFontFamily: string;
  titleSize: string;
  headingSize: string;
  bodySize: string;
  arabicSize: string;
  footerSize: string;
  tableSize: string;
  lineHeight: string;
  letterSpacing: string;
  boldWeight: string;
  normalWeight: string;
}

// ─── Document Header ──────────────────────────────────────────────────────────

export interface DocumentHeaderSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  logoWidth: string;
  logoHeight: string;
  logoPosition: 'left' | 'center' | 'right';
  companyNamePosition: 'beside-logo' | 'below-logo' | 'right';
  arabicNamePosition: 'below-english' | 'beside-english' | 'hidden';
  showDivider: boolean;
  dividerColor: string;
  dividerWidth: string;
  spacing: string;
  qrPosition: 'top-right' | 'top-left' | 'header-right' | 'none';
  qrAlignment: 'left' | 'center' | 'right';
  qrSize: number;
}

// ─── Document Footer ──────────────────────────────────────────────────────────

export interface DocumentFooterSettings {
  alignment: 'left' | 'center' | 'right' | 'space-between';
  showDivider: boolean;
  dividerColor: string;
  dividerWidth: string;
  showAddress: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showEmail: boolean;
  pageNumberPosition: 'left' | 'center' | 'right' | 'none';
  footerHeight: string;
  footerPadding: string;
  customText: string;
}

// ─── Document Tables ──────────────────────────────────────────────────────────

export interface DocumentTableSettings {
  headerBackground: string;
  headerTextColor: string;
  borderWidth: string;
  borderColor: string;
  cellPadding: string;
  rowHeight: string;
  headerHeight: string;
  alternateRowColor: string;
  columnGap: string;
  headerFont: string;
  bodyFont: string;
}

// ─── Document Totals ──────────────────────────────────────────────────────────

export interface DocumentTotalsSettings {
  alignment: 'left' | 'right';
  width: string;
  currencyAlignment: 'left' | 'right';
  decimalPrecision: number;
  showSubtotal: boolean;
  showDiscount: boolean;
  showVAT: boolean;
  grandTotalStyle: 'bold' | 'highlighted' | 'bordered';
  amountInWordsPosition: 'above-totals' | 'below-totals' | 'hidden';
  amountInWordsBackground: string;
  amountInWordsPadding: string;
  amountInWordsBorder: string;
  amountInWordsFont: string;
}

// ─── Document Signatures ──────────────────────────────────────────────────────

export interface DocumentSignatureSettings {
  signatureCount: number;
  preparedByLabel: string;
  preparedByLabelAr: string;
  checkedByLabel: string;
  checkedByLabelAr: string;
  approvedByLabel: string;
  approvedByLabelAr: string;
  receivedByLabel: string;
  receivedByLabelAr: string;
  deliveredByLabel: string;
  deliveredByLabelAr: string;
  signatureWidth: string;
  signatureLineLength: string;
  spacing: string;
  alignment: 'left' | 'center' | 'right' | 'space-between';
}

// ─── Document Colors ──────────────────────────────────────────────────────────

export interface DocumentColorSettings {
  documentBackground: string;
  titleColor: string;
  borderColor: string;
  tableHeaderBackground: string;
  tableHeaderText: string;
  tableBorderColor: string;
  accentColor: string;
  watermarkOpacity: number;
}

// ─── Numbering ────────────────────────────────────────────────────────────────

export interface NumberingSettings {
  purchaseOrderPrefix: string;
  deliveryOrderPrefix: string;
  salesInvoicePrefix: string;
  paymentPrefix: string;
  separator: string;
  includeYear: boolean;
  yearFormat: 'YYYY' | 'YY';
  zeroPadding: number;
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export interface CurrencySettings {
  code: string;
  symbol: string;
  position: 'before' | 'after';
  decimalPrecision: number;
  thousandsSeparator: string;
  decimalSeparator: string;
}

// ─── Language & Region ────────────────────────────────────────────────────────

export interface LanguageSettings {
  defaultLanguage: 'en' | 'ar';
  bilingual: boolean;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  numberFormat: string;
  timezone: string;
}

// ─── System Preferences ──────────────────────────────────────────────────────

export interface SystemPreferencesSettings {
  autoSave: boolean;
  autoSaveInterval: number;
  notifications: boolean;
}

// ─── Setting History Entry ────────────────────────────────────────────────────

export interface SettingHistoryEntry {
  id: string;
  version: number;
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  changedBy: string;
  changedAt: string;
}

// ─── Theme Definition ─────────────────────────────────────────────────────────

export interface ThemeDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  preview?: string;
  branding: Partial<BrandingSettings>;
  table: Partial<DocumentTableSettings>;
  colors: Partial<DocumentColorSettings>;
  typography: Partial<DocumentTypographySettings>;
}

// ─── Aggregate Settings ───────────────────────────────────────────────────────

export interface AllDocumentSettings {
  layout: DocumentLayoutSettings;
  typography: DocumentTypographySettings;
  header: DocumentHeaderSettings;
  footer: DocumentFooterSettings;
  table: DocumentTableSettings;
  totals: DocumentTotalsSettings;
  signatures: DocumentSignatureSettings;
  colors: DocumentColorSettings;
}

export interface AllSettings {
  company: { profile: CompanyProfileSettings };
  branding: { colors: BrandingSettings };
  document: AllDocumentSettings;
  numbering: { sequences: NumberingSettings };
  currency: { format: CurrencySettings };
  language: { region: LanguageSettings };
  system: { preferences: SystemPreferencesSettings };
}

// ─── Settings Section Navigation ──────────────────────────────────────────────

export type SettingsSection =
  | 'company'
  | 'branding'
  | 'documents'
  | 'numbering'
  | 'currency'
  | 'language'
  | 'users'
  | 'notifications'
  | 'backup'
  | 'system';

export type DocumentSettingsTab =
  | 'layout'
  | 'typography'
  | 'header'
  | 'footer'
  | 'tables'
  | 'totals'
  | 'signatures'
  | 'colors'
  | 'preview';
