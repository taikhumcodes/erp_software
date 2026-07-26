import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBrandingSettings, useSettingsMutation } from '../hooks/useSettings';
import { builtInThemes } from '../themes';
import { Palette, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const BrandingPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useBrandingSettings();
  const { save, reset, isLoading: isSaving } = useSettingsMutation('branding', 'colors');

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
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleThemeChange = (themeId: string) => {
    const theme = builtInThemes.find(t => t.id === themeId);
    if (!theme) return;
    
    setFormData(prev => ({
      ...prev,
      ...theme.branding,
      themeId
    }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      toast.success(t('settings_saved_successfully', 'Settings saved successfully'));
    } catch (err) {
      toast.error('Failed to save branding');
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset branding to defaults?')) {
      try {
        await reset();
        await refetch();
        toast.success('Branding reset to defaults');
      } catch {
        toast.error('Failed to reset');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          {t('branding')}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Themes */}
          <section className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Pre-built Themes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {builtInThemes.map(theme => (
                <div 
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`
                    border rounded-lg p-3 cursor-pointer transition-all text-center
                    ${formData.themeId === theme.id ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50'}
                  `}
                >
                  <div className="h-12 rounded bg-muted mb-2 flex flex-col overflow-hidden border">
                    <div className="h-4 w-full" style={{ backgroundColor: theme.branding.primaryColor || '#000' }}></div>
                    <div className="flex-1 flex w-full">
                      <div className="w-1/3 border-r border-muted-foreground/10" style={{ backgroundColor: theme.branding.tableHeaderColor || '#f3f4f6' }}></div>
                      <div className="w-2/3 bg-background"></div>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{theme.name}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Color Settings */}
          <section className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Brand Colors
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries({
                primaryColor: 'Primary Color',
                secondaryColor: 'Secondary Color',
                accentColor: 'Accent Color',
                borderColor: 'Border Color',
                textColor: 'Text Color',
                headerBackground: 'Header Background',
                footerBackground: 'Footer Background',
                tableHeaderColor: 'Table Header',
              }).map(([key, label]) => (
                <div key={key} className="flex items-center gap-3 border rounded-md p-2">
                  <input
                    type="color"
                    name={key}
                    value={formData[key as keyof typeof formData] as string}
                    onChange={handleChange}
                    className="w-10 h-10 rounded cursor-pointer p-0 border-0"
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium truncate">{label}</label>
                    <input
                      type="text"
                      name={key}
                      value={formData[key as keyof typeof formData] as string}
                      onChange={handleChange}
                      className="text-xs text-muted-foreground bg-transparent border-0 p-0 focus:ring-0 w-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column - Logo & Watermark */}
        <div className="space-y-6">
          <section className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Watermark
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Watermark Opacity</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    name="watermarkOpacity" 
                    min="0" max="1" step="0.01" 
                    value={formData.watermarkOpacity} 
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">
                    {Math.round(formData.watermarkOpacity * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card border rounded-lg p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Logo Position
            </h3>
            <select
              name="logoPosition"
              value={formData.logoPosition}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="left">Left Aligned</option>
              <option value="center">Center Aligned</option>
              <option value="right">Right Aligned</option>
            </select>

            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-4">
              QR Code Position
            </h3>
            <select
              name="qrPosition"
              value={formData.qrPosition}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
            </select>
          </section>
        </div>
      </div>
    </div>
  );
};
