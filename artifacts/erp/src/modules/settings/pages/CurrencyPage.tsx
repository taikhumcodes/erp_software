import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings, useSettingsMutation } from '../hooks/useSettings';
import { DEFAULT_CURRENCY } from '../constants/defaults';
import type { CurrencySettings } from '../types';
import { Coins, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const CurrencyPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useSettings<CurrencySettings>('currency', 'format', DEFAULT_CURRENCY);
  const { save, reset, isLoading: isSaving } = useSettingsMutation('currency', 'format');

  const [formData, setFormData] = React.useState(data);

  React.useEffect(() => {
    setFormData(data);
  }, [data]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    try {
      await save(formData);
      toast.success('Currency settings saved successfully');
    } catch {
      toast.error('Failed to save currency settings');
    }
  };

  const handleReset = async () => {
    if (confirm('Reset currency settings to default?')) {
      await reset();
      await refetch();
      toast.success('Reset to defaults');
    }
  };

  // Preview format
  const amount = 1234567.89;
  const parts = amount.toFixed(formData.decimalPrecision).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, formData.thousandsSeparator);
  const formattedNumber = parts.join(formData.decimalSeparator);
  const preview = formData.position === 'before' 
    ? `${formData.symbol} ${formattedNumber}` 
    : `${formattedNumber} ${formData.symbol}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          {t('currency_financial', 'Currency & Financial')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Currency Code</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} className="w-full px-3 py-2 border rounded-md uppercase" placeholder="KWD" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency Symbol</label>
              <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" placeholder="KD" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Symbol Position</label>
              <select name="position" value={formData.position} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value="before">Before Amount (e.g. KD 100)</option>
                <option value="after">After Amount (e.g. 100 KD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Decimal Precision</label>
              <select name="decimalPrecision" value={formData.decimalPrecision} onChange={handleChange} className="w-full px-3 py-2 border rounded-md">
                <option value={0}>0 (100)</option>
                <option value={2}>2 (100.00)</option>
                <option value={3}>3 (100.000)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Thousands Separator</label>
              <input type="text" name="thousandsSeparator" value={formData.thousandsSeparator} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-center font-mono" maxLength={1} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Decimal Separator</label>
              <input type="text" name="decimalSeparator" value={formData.decimalSeparator} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-center font-mono" maxLength={1} />
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">Live Preview</h3>
          <div className="text-4xl font-bold font-mono tracking-tight text-primary">
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
};
