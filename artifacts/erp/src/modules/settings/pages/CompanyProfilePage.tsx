import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCompanyProfile, useSettingsMutation } from '../hooks/useSettings';
import { SettingsService } from '../services/SettingsService';
import { Building2, Save, RotateCcw, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export const CompanyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useCompanyProfile();
  const { save, reset, isLoading: isSaving } = useSettingsMutation('company', 'profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We keep local state for the form so edits don't instantly trigger side effects
  // until the user clicks "Save"
  const [formData, setFormData] = React.useState(data);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      toast.success(t('settings_saved_successfully', 'Settings saved successfully'));
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset company profile to defaults?')) {
      try {
        await reset();
        await refetch();
        toast.success('Reset to defaults');
      } catch {
        toast.error('Failed to reset');
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { url } = await SettingsService.uploadLogo(file);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      toast.success('Logo uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload logo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          {t('company_profile')}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="px-4 py-2 text-sm border rounded hover:bg-muted flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {t('save_changes')}
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-8">
        
        {/* Logo Section */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Company Logo
          </h3>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30 overflow-hidden relative group">
              {formData.logoUrl ? (
                <img src={formData.logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
              )}
              <div 
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Upload Company Logo</p>
              <p className="text-xs text-muted-foreground mb-3">Recommended size: 500x500px (PNG, SVG, or WebP). Max 5MB.</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-primary hover:underline"
              >
                Choose File
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
        </section>

        {/* Basic Information */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name (English)</label>
              <input 
                type="text" name="nameEn" value={formData.nameEn} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name (Arabic)</label>
              <input 
                type="text" name="nameAr" value={formData.nameAr} onChange={handleChange} dir="rtl"
                className="w-full px-3 py-2 border rounded-md text-right"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Tagline</label>
              <input 
                type="text" name="tagline" value={formData.tagline} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g. Excellence in Trading & Contracting"
              />
            </div>
          </div>
        </section>

        {/* Legal & Registration */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Legal & Registration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Commercial Reg. (CR)</label>
              <input 
                type="text" name="commercialRegistration" value={formData.commercialRegistration} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Reg. No</label>
              <input 
                type="text" name="companyRegistration" value={formData.companyRegistration} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">License Number</label>
              <input 
                type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input 
                type="text" name="phone" value={formData.phone} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mobile</label>
              <input 
                type="text" name="mobile" value={formData.mobile} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input 
                type="text" name="website" value={formData.website} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice QR Code URL</label>
              <input 
                type="text" name="qrCodeUrl" value={formData.qrCodeUrl || ''} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://example.com/verify?id="
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address (English)</label>
              <input 
                type="text" name="addressEn" value={formData.addressEn} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address (Arabic)</label>
              <input 
                type="text" name="addressAr" value={formData.addressAr} onChange={handleChange} dir="rtl"
                className="w-full px-3 py-2 border rounded-md text-right"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input 
                type="text" name="city" value={formData.city} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input 
                type="text" name="country" value={formData.country} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
