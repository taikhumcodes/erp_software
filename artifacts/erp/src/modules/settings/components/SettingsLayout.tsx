/**
 * SettingsLayout — Main Settings Page Shell
 *
 * Professional settings interface with left sidebar navigation and content area.
 * Uses internal routing via state to switch between settings sections.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsNav } from './SettingsNav';
import { CompanyProfilePage } from '../pages/CompanyProfilePage';
import { BrandingPage } from '../pages/BrandingPage';
import { DocumentSettingsPage } from '../pages/DocumentSettingsPage';
import { NumberingPage } from '../pages/NumberingPage';
import { CurrencyPage } from '../pages/CurrencyPage';
import { LanguageRegionPage } from '../pages/LanguageRegionPage';
import { SystemPreferencesPage } from '../pages/SystemPreferencesPage';
import type { SettingsSection } from '../types';

const sectionComponents: Record<SettingsSection, React.ComponentType | null> = {
  company: CompanyProfilePage,
  branding: BrandingPage,
  documents: DocumentSettingsPage,
  numbering: NumberingPage,
  currency: CurrencyPage,
  language: LanguageRegionPage,
  users: null, // Links to /users page
  notifications: null, // Future
  backup: null, // Future
  system: SystemPreferencesPage,
};

export const SettingsLayout: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('company');
  const { t } = useTranslation();

  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('settings')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your ERP configuration, company profile, document templates, and system preferences.
        </p>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Left Navigation */}
        <div className="w-64 shrink-0">
          <SettingsNav
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {ActiveComponent ? (
            <ActiveComponent />
          ) : (
            <div className="bg-card border rounded-lg p-8 text-center">
              <div className="text-muted-foreground">
                <div className="text-4xl mb-4">🚧</div>
                <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                <p className="text-sm">This section will be available in a future update.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
