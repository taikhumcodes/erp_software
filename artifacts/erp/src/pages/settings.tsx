import { useTranslation } from 'react-i18next';
import { Save } from 'lucide-react';

export default function Settings() {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang);
    localStorage.setItem('erp_lang', newLang);
    
    if (newLang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings')}</h1>
      </div>

      <div className="grid gap-6">
        {/* Language & Region */}
        <div className="bg-card border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-foreground">{t('language_region')}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('language')}</label>
                <select 
                  value={i18n.language} 
                  onChange={handleLanguageChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                >
                  <option value="en">{t('english')}</option>
                  <option value="ar">{t('arabic')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('currency')}</label>
                <select 
                  disabled
                  className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground opacity-70 cursor-not-allowed"
                >
                  <option>{t('kwd')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-card border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b">
            <h3 className="font-semibold text-foreground">{t('company_information')}</h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t('company_name')}</label>
                <input 
                  type="text" 
                  defaultValue="Al-Bunyan Hardware & Building Materials"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium text-foreground">{t('address')}</label>
                <input 
                  type="text" 
                  defaultValue="Shuwaikh Industrial Area, Block 1, Street 12, Kuwait"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t('phone')}</label>
                <input 
                  type="text" 
                  defaultValue="+965 2481 0000"
                  dir="ltr"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground text-left"
                />
              </div>
            </div>
            
            <div className="pt-4 flex justify-end">
              <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center">
                <Save className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('save_changes')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
