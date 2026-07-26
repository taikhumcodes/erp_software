/**
 * Settings Defaults
 *
 * Default values for every setting in the ERP.
 * These match the current hardcoded values in DocumentConfig.ts and the ShieldMax theme,
 * ensuring zero behavior change on initial deployment.
 */
import type {
  CompanyProfileSettings,
  BrandingSettings,
  DocumentLayoutSettings,
  DocumentTypographySettings,
  DocumentHeaderSettings,
  DocumentFooterSettings,
  DocumentTableSettings,
  DocumentTotalsSettings,
  DocumentSignatureSettings,
  DocumentColorSettings,
  NumberingSettings,
  CurrencySettings,
  LanguageSettings,
  SystemPreferencesSettings,
} from '../types';

export const DEFAULT_COMPANY_PROFILE: CompanyProfileSettings = {
  nameEn: 'Al-Bunyan Trading Co.',
  nameAr: 'شركة البنيان للتجارة',
  tagline: '',
  commercialRegistration: '',
  companyRegistration: '',
  vatNumber: '',
  licenseNumber: '',
  phone: '',
  mobile: '',
  whatsapp: '',
  email: '',
  website: '',
  addressEn: 'Kuwait City, Kuwait',
  addressAr: 'مدينة الكويت، الكويت',
  city: 'Kuwait',
  country: 'Kuwait',
  postalCode: '',
  timezone: 'Asia/Kuwait',
  defaultCurrency: 'KWD',
  defaultLanguage: 'en',
  bilingual: true,
};

export const DEFAULT_BRANDING: BrandingSettings = {
  primaryColor: '#000000',
  secondaryColor: '#555555',
  accentColor: '#D4AF37',
  borderColor: '#e2e8f0',
  textColor: '#111827',
  headerBackground: '#ffffff',
  footerBackground: '#ffffff',
  tableHeaderColor: '#000000',
  watermarkOpacity: 0.05,
  logoPosition: 'left',
  logoWidth: 'auto',
  logoHeight: '60px',
  qrPosition: 'top-right',
  qrSize: 100,
  themeId: 'shieldmax',
};

export const DEFAULT_DOCUMENT_LAYOUT: DocumentLayoutSettings = {
  paperSize: 'A4',
  orientation: 'portrait',
  marginTop: '20mm',
  marginBottom: '20mm',
  marginLeft: '15mm',
  marginRight: '15mm',
  documentWidth: '210mm',
  contentWidth: '100%',
  bodyPadding: '0',
  headerHeight: '120px',
  footerHeight: '80px',
  maxTableWidth: '100%',
  sectionGap: '24px',
  lineGap: '8px',
  paragraphGap: '16px',
};

export const DEFAULT_DOCUMENT_TYPOGRAPHY: DocumentTypographySettings = {
  fontFamily: '"Inter", sans-serif',
  arabicFontFamily: '"IBM Plex Sans Arabic", sans-serif',
  titleSize: '24px',
  headingSize: '18px',
  bodySize: '12px',
  arabicSize: '12px',
  footerSize: '10px',
  tableSize: '12px',
  lineHeight: '1.5',
  letterSpacing: '0',
  boldWeight: '700',
  normalWeight: '400',
};

export const DEFAULT_DOCUMENT_HEADER: DocumentHeaderSettings = {
  alignment: 'space-between',
  logoWidth: 'auto',
  logoHeight: '60px',
  logoPosition: 'left',
  companyNamePosition: 'beside-logo',
  arabicNamePosition: 'below-english',
  showDivider: true,
  dividerColor: '#000000',
  dividerWidth: '2px',
  spacing: '24px',
  qrPosition: 'top-right',
  qrAlignment: 'right',
  qrSize: 100,
};

export const DEFAULT_DOCUMENT_FOOTER: DocumentFooterSettings = {
  alignment: 'space-between',
  showDivider: true,
  dividerColor: '#000000',
  dividerWidth: '2px',
  showAddress: true,
  showPhone: true,
  showWebsite: true,
  showEmail: true,
  pageNumberPosition: 'center',
  footerHeight: '80px',
  footerPadding: '16px',
  customText: '',
};

export const DEFAULT_DOCUMENT_TABLE: DocumentTableSettings = {
  headerBackground: '#000000',
  headerTextColor: '#ffffff',
  borderWidth: '1px',
  borderColor: '#e2e8f0',
  cellPadding: '8px',
  rowHeight: 'auto',
  headerHeight: 'auto',
  alternateRowColor: '#fafafa',
  columnGap: '0',
  headerFont: '"Inter", sans-serif',
  bodyFont: '"Inter", sans-serif',
};

export const DEFAULT_DOCUMENT_TOTALS: DocumentTotalsSettings = {
  alignment: 'right',
  width: '50%',
  currencyAlignment: 'right',
  decimalPrecision: 3,
  showSubtotal: true,
  showDiscount: true,
  showVAT: true,
  grandTotalStyle: 'bold',
  amountInWordsPosition: 'below-totals',
  amountInWordsBackground: '#f8f9fa',
  amountInWordsPadding: '12px',
  amountInWordsBorder: '4px',
  amountInWordsFont: '14px',
};

export const DEFAULT_DOCUMENT_SIGNATURES: DocumentSignatureSettings = {
  signatureCount: 4,
  preparedByLabel: 'Prepared By',
  preparedByLabelAr: 'أعد بواسطة',
  checkedByLabel: 'Checked By',
  checkedByLabelAr: 'فحص بواسطة',
  approvedByLabel: 'Approved By',
  approvedByLabelAr: 'اعتمد بواسطة',
  receivedByLabel: 'Received By',
  receivedByLabelAr: 'استلم بواسطة',
  deliveredByLabel: 'Delivered By',
  deliveredByLabelAr: 'سلّم بواسطة',
  signatureWidth: 'auto',
  signatureLineLength: '100%',
  spacing: '32px',
  alignment: 'space-between',
};

export const DEFAULT_DOCUMENT_COLORS: DocumentColorSettings = {
  documentBackground: '#ffffff',
  titleColor: '#000000',
  borderColor: '#e2e8f0',
  tableHeaderBackground: '#000000',
  tableHeaderText: '#ffffff',
  tableBorderColor: '#e2e8f0',
  accentColor: '#D4AF37',
  watermarkOpacity: 0.05,
};

export const DEFAULT_NUMBERING: NumberingSettings = {
  purchaseOrderPrefix: 'PO',
  deliveryOrderPrefix: 'DO',
  salesInvoicePrefix: 'INV',
  paymentPrefix: 'PAY',
  separator: '-',
  includeYear: true,
  yearFormat: 'YYYY',
  zeroPadding: 6,
};

export const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'KWD',
  symbol: 'KD',
  position: 'before',
  decimalPrecision: 3,
  thousandsSeparator: ',',
  decimalSeparator: '.',
};

export const DEFAULT_LANGUAGE: LanguageSettings = {
  defaultLanguage: 'en',
  bilingual: true,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  numberFormat: '#,###.###',
  timezone: 'Asia/Kuwait',
};

export const DEFAULT_SYSTEM_PREFERENCES: SystemPreferencesSettings = {
  autoSave: false,
  autoSaveInterval: 30,
  notifications: true,
};

/**
 * Map of namespace.key → defaults for easy lookup.
 */
export const DEFAULTS_MAP: Record<string, any> = {
  'company.profile': DEFAULT_COMPANY_PROFILE,
  'branding.colors': DEFAULT_BRANDING,
  'document.layout': DEFAULT_DOCUMENT_LAYOUT,
  'document.typography': DEFAULT_DOCUMENT_TYPOGRAPHY,
  'document.header': DEFAULT_DOCUMENT_HEADER,
  'document.footer': DEFAULT_DOCUMENT_FOOTER,
  'document.table': DEFAULT_DOCUMENT_TABLE,
  'document.totals': DEFAULT_DOCUMENT_TOTALS,
  'document.signatures': DEFAULT_DOCUMENT_SIGNATURES,
  'document.colors': DEFAULT_DOCUMENT_COLORS,
  'numbering.sequences': DEFAULT_NUMBERING,
  'currency.format': DEFAULT_CURRENCY,
  'language.region': DEFAULT_LANGUAGE,
  'system.preferences': DEFAULT_SYSTEM_PREFERENCES,
};
