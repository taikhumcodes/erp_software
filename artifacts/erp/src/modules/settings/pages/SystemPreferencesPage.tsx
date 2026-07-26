import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useSettingsMutation } from '../hooks/useSettings';
import { DEFAULT_SYSTEM_PREFERENCES } from '../constants/defaults';
import type { SystemPreferencesSettings } from '../types';
import { Settings, Save, RotateCcw, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsService } from '../services/SettingsService';

export const SystemPreferencesPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useSettings<SystemPreferencesSettings>('system', 'preferences', DEFAULT_SYSTEM_PREFERENCES);
  const { save, reset, isLoading: isSaving } = useSettingsMutation('system', 'preferences');

  const [formData, setFormData] = React.useState(data);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      toast.success('System preferences saved');
    } catch {
      toast.error('Failed to save settings');
    }
  };

  const handleExport = async () => {
    try {
      const allSettings = await SettingsService.exportSettings();
      const blob = new Blob([JSON.stringify(allSettings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-settings-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to export settings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          {t('system_preferences', 'System Preferences')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Editor & Workflow</h3>
          
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="autoSave" checked={formData.autoSave} onChange={handleChange} className="rounded" />
            Enable Auto-save in Document Editors
          </label>
          
          <div className={formData.autoSave ? '' : 'opacity-50 pointer-events-none'}>
            <label className="block text-sm font-medium mb-1">Auto-save Interval (seconds)</label>
            <input type="number" name="autoSaveInterval" value={formData.autoSaveInterval} onChange={handleChange} min="10" className="w-full px-3 py-2 border rounded-md" />
          </div>

          <label className="flex items-center gap-2 text-sm font-medium pt-4 border-t">
            <input type="checkbox" name="notifications" checked={formData.notifications} onChange={handleChange} className="rounded" />
            Enable In-App Notifications (Toasts)
          </label>
        </div>

        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Import / Export Settings</h3>
          <p className="text-sm text-muted-foreground">Download a complete backup of all ERP settings, or import settings from another instance.</p>
          
          <div className="flex gap-4 pt-2">
            <button onClick={handleExport} className="flex-1 px-4 py-3 border rounded-lg hover:bg-muted flex flex-col items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Download className="w-6 h-6 text-primary" />
              Export Settings
            </button>
            <button onClick={() => alert('Import UI coming soon in Phase 3')} className="flex-1 px-4 py-3 border rounded-lg hover:bg-muted flex flex-col items-center justify-center gap-2 text-sm font-medium transition-colors">
              <Upload className="w-6 h-6 text-primary" />
              Import Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
