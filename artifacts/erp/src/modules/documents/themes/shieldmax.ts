import { DocumentTheme } from './default';

export const shieldMaxTheme: DocumentTheme = {
  id: 'shieldmax',
  name: 'Shield Max Theme',
  primaryColor: '#000000',
  secondaryColor: '#333333',
  accentColor: '#F2A93B', // Warm amber/orange — matches ShieldMax brand mark
  borders: '1px solid #e2e8f0', // slate-200
  fonts: {
    primary: '"Inter", sans-serif',
    secondary: '"IBM Plex Sans Arabic", sans-serif'
  },
  table: {
    headerBackground: '#000000',
    headerText: '#ffffff',
    rowBorder: '1px solid #e2e8f0',
    alternatingBackground: '#fafafa',
  }
};
