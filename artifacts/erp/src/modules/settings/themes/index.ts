/**
 * Built-in Theme Definitions
 *
 * Provides 8 pre-built themes that administrators can switch between.
 * Each theme overrides branding, table, color, and typography defaults.
 */
import type { ThemeDefinition } from '../types';

export const builtInThemes: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    nameAr: 'افتراضي',
    description: 'Clean, minimal theme with neutral colors',
    branding: {
      primaryColor: '#000000',
      secondaryColor: '#4b5563',
      accentColor: '#2563eb',
      tableHeaderColor: '#f3f4f6',
    },
    table: {
      headerBackground: '#f3f4f6',
      headerTextColor: '#111827',
      borderColor: '#e5e7eb',
      alternateRowColor: 'transparent',
    },
    colors: {
      titleColor: '#000000',
      accentColor: '#2563eb',
    },
    typography: {},
  },
  {
    id: 'shieldmax',
    name: 'Shield Max',
    nameAr: 'شيلد ماكس',
    description: 'Professional dark-header theme with gold accents',
    branding: {
      primaryColor: '#000000',
      secondaryColor: '#333333',
      accentColor: '#D4AF37',
      tableHeaderColor: '#000000',
    },
    table: {
      headerBackground: '#000000',
      headerTextColor: '#ffffff',
      borderColor: '#e2e8f0',
      alternateRowColor: '#fafafa',
    },
    colors: {
      titleColor: '#000000',
      accentColor: '#D4AF37',
    },
    typography: {
      fontFamily: '"Inter", sans-serif',
    },
  },
  {
    id: 'classic',
    name: 'Classic',
    nameAr: 'كلاسيكي',
    description: 'Traditional business document style with serif accents',
    branding: {
      primaryColor: '#1a365d',
      secondaryColor: '#2d3748',
      accentColor: '#c53030',
      tableHeaderColor: '#1a365d',
    },
    table: {
      headerBackground: '#1a365d',
      headerTextColor: '#ffffff',
      borderColor: '#cbd5e0',
      alternateRowColor: '#f7fafc',
    },
    colors: {
      titleColor: '#1a365d',
      accentColor: '#c53030',
    },
    typography: {},
  },
  {
    id: 'corporate',
    name: 'Corporate',
    nameAr: 'مؤسسي',
    description: 'Modern corporate look with blue tones',
    branding: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      accentColor: '#f59e0b',
      tableHeaderColor: '#1e40af',
    },
    table: {
      headerBackground: '#1e40af',
      headerTextColor: '#ffffff',
      borderColor: '#dbeafe',
      alternateRowColor: '#eff6ff',
    },
    colors: {
      titleColor: '#1e40af',
      accentColor: '#f59e0b',
    },
    typography: {},
  },
  {
    id: 'modern',
    name: 'Modern',
    nameAr: 'عصري',
    description: 'Contemporary design with gradient-inspired accents',
    branding: {
      primaryColor: '#6d28d9',
      secondaryColor: '#7c3aed',
      accentColor: '#ec4899',
      tableHeaderColor: '#6d28d9',
    },
    table: {
      headerBackground: '#6d28d9',
      headerTextColor: '#ffffff',
      borderColor: '#e9d5ff',
      alternateRowColor: '#faf5ff',
    },
    colors: {
      titleColor: '#6d28d9',
      accentColor: '#ec4899',
    },
    typography: {},
  },
  {
    id: 'minimal',
    name: 'Minimal',
    nameAr: 'بسيط',
    description: 'Ultra-clean design with thin borders and subtle colors',
    branding: {
      primaryColor: '#374151',
      secondaryColor: '#6b7280',
      accentColor: '#059669',
      tableHeaderColor: '#f9fafb',
    },
    table: {
      headerBackground: '#f9fafb',
      headerTextColor: '#374151',
      borderColor: '#f3f4f6',
      alternateRowColor: 'transparent',
    },
    colors: {
      titleColor: '#374151',
      accentColor: '#059669',
    },
    typography: {},
  },
  {
    id: 'construction',
    name: 'Construction',
    nameAr: 'إنشائي',
    description: 'Bold theme suited for construction and industrial companies',
    branding: {
      primaryColor: '#b45309',
      secondaryColor: '#92400e',
      accentColor: '#fbbf24',
      tableHeaderColor: '#b45309',
    },
    table: {
      headerBackground: '#b45309',
      headerTextColor: '#ffffff',
      borderColor: '#fde68a',
      alternateRowColor: '#fffbeb',
    },
    colors: {
      titleColor: '#b45309',
      accentColor: '#fbbf24',
    },
    typography: {},
  },
  {
    id: 'custom',
    name: 'Custom',
    nameAr: 'مخصص',
    description: 'Fully custom theme — all colors manually configured',
    branding: {},
    table: {},
    colors: {},
    typography: {},
  },
];

/**
 * Get a theme definition by ID.
 */
export function getThemeById(id: string): ThemeDefinition | undefined {
  return builtInThemes.find(t => t.id === id);
}
