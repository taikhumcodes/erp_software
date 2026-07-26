import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useSettingsMutation } from '../hooks/useSettings';
import { DEFAULT_LANGUAGE } from '../constants/defaults';
import type { LanguageSettings } from '../types';
import { Globe, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const LanguageRegionPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useSettings<LanguageSettings>('language', 'region', DEFAULT_LANGUAGE);
  const { save, reset, isLoading: isSaving } = useSettingsMutation('language', 'region');

  const [formData, setFormData] = React.useState(data);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

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
      toast.success('Language & region settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          {t('language_region', 'Language & Region')}
        </h2>
        <div className="flex gap-3">
          <button onClick={async () => { if(confirm('Reset?')) { await reset(); refetch(); } }} disabled={isSaving} className="px-4 py-2 text-sm border rounded hover:bg-muted flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Language</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Default System Language</label>
              <select name="defaultLanguage" value={formData.defaultLanguage} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="en">English</option>
                <option value="ar">Arabic (عربي)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium pt-2">
              <input type="checkbox" name="bilingual" checked={formData.bilingual} onChange={handleChange} className="rounded" />
              Enable Bilingual Mode (Show English and Arabic in documents)
            </label>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Region & Formats</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Timezone</label>
              <select name="timezone" value={formData.timezone} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="Asia/Kuwait">Asia/Kuwait (AST)</option>
                <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date Format</label>
              <select name="dateFormat" value={formData.dateFormat} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/07/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/25/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-25)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time Format</label>
              <select name="timeFormat" value={formData.timeFormat} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="12h">12-hour (e.g. 2:30 PM)</option>
                <option value="24h">24-hour (e.g. 14:30)</option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
