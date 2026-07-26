import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useSettingsMutation } from '../hooks/useSettings';
import { DEFAULT_NUMBERING } from '../constants/defaults';
import type { NumberingSettings } from '../types';
import { Hash, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const NumberingPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useSettings<NumberingSettings>('numbering', 'sequences', DEFAULT_NUMBERING);
  const { save, reset, isLoading: isSaving } = useSettingsMutation('numbering', 'sequences');

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
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      toast.success('Numbering sequences saved successfully');
    } catch {
      toast.error('Failed to save numbering sequences');
    }
  };

  const handleReset = async () => {
    if (confirm('Reset numbering sequences to default?')) {
      await reset();
      await refetch();
      toast.success('Reset to defaults');
    }
  };

  const renderPreview = (prefix: string) => {
    const yearStr = formData.includeYear ? `${new Date().getFullYear().toString().slice(formData.yearFormat === 'YY' ? 2 : 0)}${formData.separator}` : '';
    const numStr = '1'.padStart(formData.zeroPadding, '0');
    return `${prefix}${formData.separator}${yearStr}${numStr}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Hash className="w-5 h-5 text-primary" />
          {t('numbering_sequences', 'Numbering Sequences')}
        </h2>
        <div className="flex gap-3">
          <button onClick={handleReset} disabled={isSaving} className="px-4 py-2 text-sm border rounded hover:bg-muted flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 flex items-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 space-y-8">
        
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Global Format
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Separator</label>
              <input type="text" name="separator" value={formData.separator} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Zero Padding</label>
              <input type="number" name="zeroPadding" value={formData.zeroPadding} onChange={handleChange} min="1" max="10" className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Year Format</label>
              <select name="yearFormat" value={formData.yearFormat} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="YYYY">YYYY (e.g. 2026)</option>
                <option value="YY">YY (e.g. 26)</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="includeYear" checked={formData.includeYear} onChange={handleChange} className="rounded" />
                Include year in document numbers
              </label>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Document Prefixes
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Purchase Order', key: 'purchaseOrderPrefix' },
              { label: 'Delivery Order', key: 'deliveryOrderPrefix' },
              { label: 'Sales Invoice', key: 'salesInvoicePrefix' },
              { label: 'Payment Receipt', key: 'paymentPrefix' },
            ].map(doc => (
              <div key={doc.key} className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                <div className="w-48 font-medium">{doc.label}</div>
                <div className="w-32">
                  <input 
                    type="text" 
                    name={doc.key} 
                    value={formData[doc.key as keyof typeof formData] as string} 
                    onChange={handleChange} 
                    className="w-full px-3 py-1.5 border rounded-md" 
                  />
                </div>
                <div className="flex-1 text-right text-muted-foreground font-mono text-sm">
                  Preview: {renderPreview(formData[doc.key as keyof typeof formData] as string)}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};
