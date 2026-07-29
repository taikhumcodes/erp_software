import { SettingsService } from '../../settings/services/SettingsService';
import { CompanyProfile } from '../types';

class ProfileService {
  async getProfile(): Promise<CompanyProfile> {
    // Load necessary namespaces from centralized SettingsService
    const profile = await SettingsService.load<any>('company', 'profile');
    const branding = await SettingsService.load<any>('branding', 'colors');
    const layout = await SettingsService.load<any>('document', 'layout');
    const currency = await SettingsService.load<any>('currency', 'format');
    const lang = await SettingsService.load<any>('language', 'region');
    const sigs = await SettingsService.load<any>('document', 'signatures');
    const footer = await SettingsService.load<any>('document', 'footer');

    return {
      logoUrl: profile.logoUrl || undefined,
      qrCodeUrl: profile.qrCodeUrl || undefined,
      nameEn: profile.nameEn || 'Shield Max',
      nameAr: profile.nameAr || 'شركة البنيان للتجارة',
      commercialRegistration: profile.commercialRegistration || undefined,
      companyRegistration: profile.companyRegistration || undefined,
      phone: profile.phone || undefined,
      mobile: profile.mobile || undefined,
      email: profile.email || undefined,
      website: profile.website || undefined,
      whatsapp: profile.whatsapp || undefined,
      addressEn: profile.addressEn || 'Kuwait City, Kuwait',
      addressAr: profile.addressAr || 'مدينة الكويت، الكويت',
      city: profile.city || 'Kuwait',
      country: profile.country || 'Kuwait',
      postalCode: profile.postalCode || undefined,
      primaryColor: branding.primaryColor || '#000000',
      secondaryColor: branding.secondaryColor || '#555555',
      accentColor: branding.accentColor || '#d4af37',
      watermarkUrl: branding.watermarkUrl || undefined,
      currency: currency.code || 'KWD',
      dateFormat: lang.dateFormat || 'DD/MM/YYYY',
      decimalPrecision: currency.decimalPrecision ?? 3,
      paperSize: (layout.paperSize as any) || 'A4',
      defaultLanguage: lang.defaultLanguage || 'en',
      bilingual: lang.bilingual !== false,
      preparedByLabel: sigs.preparedByLabel || 'Prepared By',
      checkedByLabel: sigs.checkedByLabel || 'Checked By',
      approvedByLabel: sigs.approvedByLabel || 'Approved By',
      receivedByLabel: sigs.receivedByLabel || 'Received By',
      termsEn: footer.termsEn || undefined,
      termsAr: footer.termsAr || undefined,
    };
  }

  clearCache() {
    // The cache is now managed globally by SettingsService
  }
}

export const CompanyProfileService = new ProfileService();
