import type { CompanyProfile } from '../types/document';

/**
 * Default company profile for Al-Bunyan.
 * In Phase 2, this will be loaded from the Settings API / Company Profile endpoint.
 */
export const defaultCompanyProfile: CompanyProfile = {
  logoUrl: null,
  nameEn: 'Al-Bunyan Trading & Contracting',
  nameAr: 'شركة البنيان للتجارة والمقاولات',
  address: 'Kuwait City, Kuwait',
  phone: '+965 0000 0000',
  email: 'info@albunyan.com',
  website: 'www.albunyan.com',
  commercialRegistration: '',
  vatTrn: '',
  footerMessage: 'Thank you for your business',
  footerMessageAr: 'شكراً لتعاملكم معنا',
  qrCodeUrl: null,
  defaultCurrency: 'KWD',
};
