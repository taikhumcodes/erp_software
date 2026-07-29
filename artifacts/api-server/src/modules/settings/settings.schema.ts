/**
 * Settings Validation Schemas
 *
 * Zod schemas for every settings namespace.
 * Used by the settings service to validate data before persistence.
 */
import { z } from 'zod';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hexColor = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Invalid hex color');
const positiveDimension = z.string().regex(/^\d+(\.\d+)?(mm|px|pt|em|rem|%)$/, 'Invalid dimension (e.g. 20mm, 16px)');
const positiveNumber = z.number().nonnegative();

// ─── Company Profile ──────────────────────────────────────────────────────────

export const companyProfileSchema = z.object({
  logoUrl: z.string().optional(),
  qrCodeUrl: z.string().default(''),
  nameEn: z.string().min(1, 'English name is required'),
  nameAr: z.string().default(''),
  tagline: z.string().default(''),
  commercialRegistration: z.string().default(''),
  companyRegistration: z.string().default(''),
  vatNumber: z.string().default(''),
  licenseNumber: z.string().default(''),
  phone: z.string().default(''),
  mobile: z.string().default(''),
  whatsapp: z.string().default(''),
  email: z.string().email().or(z.literal('')).default(''),
  website: z.string().default(''),
  addressEn: z.string().default(''),
  addressAr: z.string().default(''),
  city: z.string().default(''),
  country: z.string().default(''),
  postalCode: z.string().default(''),
  timezone: z.string().default('Asia/Kuwait'),
  defaultCurrency: z.string().default('KWD'),
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  bilingual: z.boolean().default(true),
});

// ─── Branding ─────────────────────────────────────────────────────────────────

export const brandingSchema = z.object({
  primaryColor: hexColor.default('#000000'),
  secondaryColor: hexColor.default('#555555'),
  accentColor: hexColor.default('#D4AF37'),
  borderColor: hexColor.default('#e2e8f0'),
  textColor: hexColor.default('#111827'),
  headerBackground: hexColor.default('#ffffff'),
  footerBackground: hexColor.default('#ffffff'),
  tableHeaderColor: hexColor.default('#000000'),
  watermarkUrl: z.string().optional(),
  watermarkOpacity: z.number().min(0).max(1).default(0.05),
  logoPosition: z.enum(['left', 'center', 'right']).default('left'),
  logoWidth: z.string().default('auto'),
  logoHeight: z.string().default('60px'),
  qrPosition: z.enum(['top-right', 'top-left', 'bottom-right', 'bottom-left']).default('top-right'),
  qrSize: positiveNumber.default(100),
  themeId: z.string().default('shieldmax'),
});

// ─── Document Layout ──────────────────────────────────────────────────────────

export const documentLayoutSchema = z.object({
  paperSize: z.enum(['A4', 'Letter', 'Legal']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  marginTop: z.string().default('20mm'),
  marginBottom: z.string().default('20mm'),
  marginLeft: z.string().default('15mm'),
  marginRight: z.string().default('15mm'),
  documentWidth: z.string().default('210mm'),
  contentWidth: z.string().default('100%'),
  bodyPadding: z.string().default('0'),
  headerHeight: z.string().default('120px'),
  footerHeight: z.string().default('80px'),
  maxTableWidth: z.string().default('100%'),
  sectionGap: z.string().default('24px'),
  lineGap: z.string().default('8px'),
  paragraphGap: z.string().default('16px'),
});

// ─── Document Typography ──────────────────────────────────────────────────────

export const documentTypographySchema = z.object({
  fontFamily: z.string().default('"Inter", sans-serif'),
  arabicFontFamily: z.string().default('"IBM Plex Sans Arabic", sans-serif'),
  titleSize: z.string().default('24px'),
  headingSize: z.string().default('18px'),
  bodySize: z.string().default('12px'),
  arabicSize: z.string().default('12px'),
  footerSize: z.string().default('10px'),
  tableSize: z.string().default('12px'),
  lineHeight: z.string().default('1.5'),
  letterSpacing: z.string().default('0'),
  boldWeight: z.string().default('700'),
  normalWeight: z.string().default('400'),
});

// ─── Document Header ──────────────────────────────────────────────────────────

export const documentHeaderSchema = z.object({
  alignment: z.enum(['left', 'center', 'right', 'space-between']).default('space-between'),
  logoWidth: z.string().default('auto'),
  logoHeight: z.string().default('60px'),
  logoPosition: z.enum(['left', 'center', 'right']).default('left'),
  companyNamePosition: z.enum(['beside-logo', 'below-logo', 'right']).default('beside-logo'),
  arabicNamePosition: z.enum(['below-english', 'beside-english', 'hidden']).default('below-english'),
  showDivider: z.boolean().default(true),
  dividerColor: hexColor.default('#000000'),
  dividerWidth: z.string().default('2px'),
  spacing: z.string().default('24px'),
  qrPosition: z.enum(['top-right', 'top-left', 'header-right', 'none']).default('top-right'),
  qrAlignment: z.enum(['left', 'center', 'right']).default('right'),
  qrSize: positiveNumber.default(100),
});

// ─── Document Footer ──────────────────────────────────────────────────────────

export const documentFooterSchema = z.object({
  alignment: z.enum(['left', 'center', 'right', 'space-between']).default('space-between'),
  showDivider: z.boolean().default(true),
  dividerColor: hexColor.default('#000000'),
  dividerWidth: z.string().default('2px'),
  showAddress: z.boolean().default(true),
  showPhone: z.boolean().default(true),
  showWebsite: z.boolean().default(true),
  showEmail: z.boolean().default(true),
  pageNumberPosition: z.enum(['left', 'center', 'right', 'none']).default('center'),
  footerHeight: z.string().default('80px'),
  footerPadding: z.string().default('16px'),
  customText: z.string().default(''),
});

// ─── Document Tables ──────────────────────────────────────────────────────────

export const documentTableSchema = z.object({
  headerBackground: hexColor.default('#000000'),
  headerTextColor: hexColor.default('#ffffff'),
  borderWidth: z.string().default('1px'),
  borderColor: hexColor.default('#e2e8f0'),
  cellPadding: z.string().default('8px'),
  rowHeight: z.string().default('auto'),
  headerHeight: z.string().default('auto'),
  alternateRowColor: hexColor.default('#fafafa'),
  columnGap: z.string().default('0'),
  headerFont: z.string().default('"Inter", sans-serif'),
  bodyFont: z.string().default('"Inter", sans-serif'),
});

// ─── Document Totals ──────────────────────────────────────────────────────────

export const documentTotalsSchema = z.object({
  alignment: z.enum(['left', 'right']).default('right'),
  width: z.string().default('50%'),
  currencyAlignment: z.enum(['left', 'right']).default('right'),
  decimalPrecision: z.number().int().min(0).max(6).default(3),
  showSubtotal: z.boolean().default(true),
  showDiscount: z.boolean().default(true),
  showVAT: z.boolean().default(true),
  grandTotalStyle: z.enum(['bold', 'highlighted', 'bordered']).default('bold'),
  amountInWordsPosition: z.enum(['above-totals', 'below-totals', 'hidden']).default('below-totals'),
  amountInWordsBackground: hexColor.default('#f8f9fa'),
  amountInWordsPadding: z.string().default('12px'),
  amountInWordsBorder: z.string().default('4px'),
  amountInWordsFont: z.string().default('14px'),
});

// ─── Document Signatures ──────────────────────────────────────────────────────

export const documentSignatureSchema = z.object({
  signatureCount: z.number().int().min(1).max(5).default(4),
  preparedByLabel: z.string().default('Prepared By'),
  preparedByLabelAr: z.string().default('أعد بواسطة'),
  checkedByLabel: z.string().default('Checked By'),
  checkedByLabelAr: z.string().default('فحص بواسطة'),
  approvedByLabel: z.string().default('Approved By'),
  approvedByLabelAr: z.string().default('اعتمد بواسطة'),
  receivedByLabel: z.string().default('Received By'),
  receivedByLabelAr: z.string().default('استلم بواسطة'),
  deliveredByLabel: z.string().default('Delivered By'),
  deliveredByLabelAr: z.string().default('سلّم بواسطة'),
  signatureWidth: z.string().default('auto'),
  signatureLineLength: z.string().default('100%'),
  spacing: z.string().default('32px'),
  alignment: z.enum(['left', 'center', 'right', 'space-between']).default('space-between'),
});

// ─── Document Colors ──────────────────────────────────────────────────────────

export const documentColorSchema = z.object({
  documentBackground: hexColor.default('#ffffff'),
  titleColor: hexColor.default('#000000'),
  borderColor: hexColor.default('#e2e8f0'),
  tableHeaderBackground: hexColor.default('#000000'),
  tableHeaderText: hexColor.default('#ffffff'),
  tableBorderColor: hexColor.default('#e2e8f0'),
  accentColor: hexColor.default('#D4AF37'),
  watermarkOpacity: z.number().min(0).max(1).default(0.05),
});

// ─── Numbering ────────────────────────────────────────────────────────────────

export const numberingSchema = z.object({
  purchaseOrderPrefix: z.string().default('PO'),
  deliveryOrderPrefix: z.string().default('DO'),
  salesInvoicePrefix: z.string().default('INV'),
  paymentPrefix: z.string().default('PAY'),
  separator: z.string().default('-'),
  includeYear: z.boolean().default(true),
  yearFormat: z.enum(['YYYY', 'YY']).default('YYYY'),
  zeroPadding: z.number().int().min(1).max(10).default(6),
});

// ─── Currency ─────────────────────────────────────────────────────────────────

export const currencySchema = z.object({
  code: z.string().default('KWD'),
  symbol: z.string().default('KD'),
  position: z.enum(['before', 'after']).default('before'),
  decimalPrecision: z.number().int().min(0).max(6).default(3),
  thousandsSeparator: z.string().default(','),
  decimalSeparator: z.string().default('.'),
});

// ─── Language & Region ────────────────────────────────────────────────────────

export const languageSchema = z.object({
  defaultLanguage: z.enum(['en', 'ar']).default('en'),
  bilingual: z.boolean().default(true),
  dateFormat: z.string().default('DD/MM/YYYY'),
  timeFormat: z.enum(['12h', '24h']).default('12h'),
  numberFormat: z.string().default('#,###.###'),
  timezone: z.string().default('Asia/Kuwait'),
});

// ─── System Preferences ──────────────────────────────────────────────────────

export const systemPreferencesSchema = z.object({
  autoSave: z.boolean().default(false),
  autoSaveInterval: z.number().int().min(10).default(30),
  notifications: z.boolean().default(true),
});

// ─── Schema Map ───────────────────────────────────────────────────────────────

export const settingsSchemaMap: Record<string, z.ZodSchema> = {
  'company.profile': companyProfileSchema,
  'branding.colors': brandingSchema,
  'document.layout': documentLayoutSchema,
  'document.typography': documentTypographySchema,
  'document.header': documentHeaderSchema,
  'document.footer': documentFooterSchema,
  'document.table': documentTableSchema,
  'document.totals': documentTotalsSchema,
  'document.signatures': documentSignatureSchema,
  'document.colors': documentColorSchema,
  'numbering.sequences': numberingSchema,
  'currency.format': currencySchema,
  'language.region': languageSchema,
  'system.preferences': systemPreferencesSchema,
};

/**
 * Returns the Zod schema for a given namespace.key combo.
 * Falls back to z.any() for unknown keys (forward compatibility).
 */
export function getSchemaFor(namespace: string, key: string): z.ZodSchema {
  const schemaKey = `${namespace}.${key}`;
  return settingsSchemaMap[schemaKey] ?? z.record(z.unknown());
}
