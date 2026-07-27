import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAllDocumentSettings, useSettingsMutation } from '../hooks/useSettings';
import { DocumentPreview } from '../components/DocumentPreview';
import { FileText, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

// Type for the sub-tabs
type Tab = 'layout' | 'typography' | 'header' | 'footer' | 'tables' | 'totals' | 'signatures' | 'colors';

export const DocumentSettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { settings, isLoading } = useAllDocumentSettings();
  
  // Create mutations for all the sections we manage here
  const mutLayout = useSettingsMutation('document', 'layout');
  const mutTypography = useSettingsMutation('document', 'typography');
  const mutHeader = useSettingsMutation('document', 'header');
  const mutFooter = useSettingsMutation('document', 'footer');
  const mutTable = useSettingsMutation('document', 'table');
  const mutTotals = useSettingsMutation('document', 'totals');
  const mutSignatures = useSettingsMutation('document', 'signatures');
  const mutColors = useSettingsMutation('document', 'colors');

  const [activeTab, setActiveTab] = useState<Tab>('layout');
  
  // Local state for all settings forms so live preview works immediately
  const [formData, setFormData] = useState(settings);

  React.useEffect(() => {
    if (!isLoading) {
      setFormData(settings);
    }
  }, [settings, isLoading]);

  const isSaving = 
    mutLayout.isLoading || mutTypography.isLoading || mutHeader.isLoading ||
    mutFooter.isLoading || mutTable.isLoading || mutTotals.isLoading ||
    mutSignatures.isLoading || mutColors.isLoading;

  const handleSave = async () => {
    try {
      await Promise.all([
        mutLayout.save(formData.layout),
        mutTypography.save(formData.typography),
        mutHeader.save(formData.header),
        mutFooter.save(formData.footer),
        mutTable.save(formData.table),
        mutTotals.save(formData.totals),
        mutSignatures.save(formData.signatures),
        mutColors.save(formData.colors),
      ]);
      toast.success(t('settings_saved_successfully', 'Document settings saved successfully'));
    } catch {
      toast.error('Failed to save some document settings');
    }
  };

  const handleChange = (section: Tab, field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'layout', label: 'Layout' },
    { id: 'typography', label: 'Typography' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
    { id: 'tables', label: 'Tables' },
    { id: 'totals', label: 'Totals' },
    { id: 'signatures', label: 'Signatures' },
    { id: 'colors', label: 'Colors' },
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t('document_settings')}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setFormData(settings)}
            disabled={isSaving}
            className="px-4 py-2 text-sm border rounded hover:bg-muted flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('save_changes')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Settings Panel */}
        <div className="w-[55%] flex flex-col min-h-0 bg-card border rounded-lg overflow-hidden">
          {/* Sub-navigation tabs */}
          <div className="flex overflow-x-auto border-b shrink-0 bg-muted/20 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                  ${activeTab === tab.id 
                    ? 'border-primary text-primary bg-background' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Example form fields based on active tab */}
            {activeTab === 'layout' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Paper Size</label>
                    <select 
                      value={formData.layout.paperSize} 
                      onChange={e => handleChange('layout', 'paperSize', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Letter</option>
                      <option value="Legal">Legal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Orientation</label>
                    <select 
                      value={formData.layout.orientation} 
                      onChange={e => handleChange('layout', 'orientation', e.target.value)}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>
                
                <h4 className="font-medium text-sm mt-6 mb-2">Margins</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {['marginTop', 'marginBottom', 'marginLeft', 'marginRight'].map(field => (
                    <div key={field}>
                      <label className="block text-xs text-muted-foreground mb-1">{field.replace('margin', '')}</label>
                      <input 
                        type="text" 
                        value={formData.layout[field as keyof typeof formData.layout]} 
                        onChange={e => handleChange('layout', field, e.target.value)}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'footer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Terms & Conditions (English)</label>
                  <textarea
                    value={formData.footer.termsEn}
                    onChange={e => handleChange('footer', 'termsEn', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Shown in the terms box on Sales Invoice, Purchase Order, and Delivery Order footers.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">الشروط والأحكام (Arabic)</label>
                  <textarea
                    value={formData.footer.termsAr}
                    onChange={e => handleChange('footer', 'termsAr', e.target.value)}
                    rows={3}
                    dir="rtl"
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  />
                </div>
              </div>
            )}

            {/* Note: In a complete implementation, we would add the remaining form fields for Typography, Header, Tables, etc. here. */}
            {activeTab !== 'layout' && activeTab !== 'footer' && (
              <div className="text-muted-foreground text-center py-12">
                Configure {activeTab} settings here.
                <p className="text-sm mt-2">These fields map directly to the interfaces in `types/index.ts`.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="w-[45%] bg-muted/30 border rounded-lg overflow-hidden flex flex-col">
          <div className="p-3 border-b bg-background font-medium text-sm flex justify-between items-center shrink-0">
            Live Preview
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-100">
            <DocumentPreview settings={formData} />
          </div>
        </div>
        
      </div>
    </div>
  );
};
