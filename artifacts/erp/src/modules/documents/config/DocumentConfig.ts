import { SettingsService } from '../../settings/services/SettingsService';
import { DEFAULTS_MAP } from '../../settings/constants/defaults';
import type { AllDocumentSettings } from '../../settings/types';

/**
 * Dynamic DocumentConfig
 * Retains backward compatibility while pointing to the new SettingsService.
 * Components should ideally migrate to useAllDocumentSettings hook instead.
 */
export const DocumentConfig = {
  get paperSize() { return SettingsService.get<{paperSize: string}>('document', 'layout')?.paperSize ?? 'A4'; },
  
  get margins() { 
    const layout = SettingsService.get<any>('document', 'layout') ?? DEFAULTS_MAP['document.layout'];
    return {
      top: layout.marginTop,
      bottom: layout.marginBottom,
      left: layout.marginLeft,
      right: layout.marginRight,
    };
  },
  
  get fonts() {
    const typo = SettingsService.get<any>('document', 'typography') ?? DEFAULTS_MAP['document.typography'];
    return {
      primary: typo.fontFamily,
      secondary: typo.arabicFontFamily,
    };
  },
  
  get fontSizes() {
    const typo = SettingsService.get<any>('document', 'typography') ?? DEFAULTS_MAP['document.typography'];
    return {
      small: typo.footerSize,
      normal: typo.bodySize,
      large: typo.headingSize,
      title: typo.titleSize,
    };
  },
  
  get headerHeight() { return SettingsService.get<any>('document', 'layout')?.headerHeight ?? '120px'; },
  get footerHeight() { return SettingsService.get<any>('document', 'layout')?.footerHeight ?? '80px'; },
  
  get logoSize() { 
    const header = SettingsService.get<any>('document', 'header') ?? DEFAULTS_MAP['document.header'];
    return {
      width: header.logoWidth,
      height: header.logoHeight,
    };
  },
  
  get tableWidth() { return SettingsService.get<any>('document', 'layout')?.maxTableWidth ?? '100%'; },
  
  get padding() {
    const layout = SettingsService.get<any>('document', 'layout') ?? DEFAULTS_MAP['document.layout'];
    const table = SettingsService.get<any>('document', 'table') ?? DEFAULTS_MAP['document.table'];
    return {
      cell: table.cellPadding,
      section: layout.paragraphGap,
    };
  },
  
  get borderRadius() { return '4px'; }, // Static for now
  
  get sectionSpacing() { return SettingsService.get<any>('document', 'layout')?.sectionGap ?? '24px'; },
  
  get qrSize() { return SettingsService.get<any>('document', 'header')?.qrSize ?? 100; },
  
  // Default fallback values
  defaults: {
    primaryColor: '#000000',
    secondaryColor: '#555555',
    accentColor: '#d4af37', // Gold
  }
};
