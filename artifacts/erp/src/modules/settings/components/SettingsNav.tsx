import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { 
  Building2, 
  Palette, 
  FileText, 
  Hash, 
  Coins, 
  Globe, 
  Users, 
  Bell, 
  DatabaseBackup, 
  Settings,
  Activity
} from 'lucide-react';
import type { SettingsSection } from '../types';

interface NavItem {
  id: SettingsSection;
  icon: React.ElementType;
  labelKey: string;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  { id: 'company', icon: Building2, labelKey: 'company_profile' },
  { id: 'branding', icon: Palette, labelKey: 'branding' },
  { id: 'documents', icon: FileText, labelKey: 'document_settings' },
  { id: 'numbering', icon: Hash, labelKey: 'numbering_sequences' },
  { id: 'currency', icon: Coins, labelKey: 'currency_financial' },
  { id: 'language', icon: Globe, labelKey: 'language_region' },
  { id: 'users', icon: Users, labelKey: 'users_permissions', disabled: true },
  { id: 'notifications', icon: Bell, labelKey: 'notifications', disabled: true },
  { id: 'backup', icon: DatabaseBackup, labelKey: 'backup_restore', disabled: false },
  { id: 'page-visits', icon: Activity, labelKey: 'page_visits', disabled: false },
  { id: 'system', icon: Settings, labelKey: 'system_preferences' },
];

interface SettingsNavProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export const SettingsNav: React.FC<SettingsNavProps> = ({ 
  activeSection, 
  onSectionChange 
}) => {
  const { t } = useTranslation();
  const { data: user } = useGetCurrentUser();
  const isSuperAdmin = user?.email === 'admin@albunyan.com';

  const visibleItems = navItems.filter(item => {
    // Only visible if logged in as admin@albunyan.com
    if (item.id === 'backup' || item.id === 'page-visits') return isSuperAdmin;
    return true;
  });

  return (
    <nav className="flex flex-col space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => !item.disabled && onSectionChange(item.id)}
            disabled={item.disabled}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${isActive 
                ? 'bg-primary/10 text-primary' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="truncate">
              {t(item.labelKey, item.labelKey.replace('_', ' '))}
            </span>
            {item.disabled && (
              <span className="ml-auto text-[10px] uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                Soon
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
