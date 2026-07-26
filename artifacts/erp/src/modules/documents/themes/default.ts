export interface DocumentTheme {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  borders: string;
  fonts: {
    primary: string;
    secondary: string;
  };
  table: {
    headerBackground: string;
    headerText: string;
    rowBorder: string;
    alternatingBackground: string;
  };
}

export const defaultTheme: DocumentTheme = {
  id: 'default',
  name: 'Default Theme',
  primaryColor: '#000000',
  secondaryColor: '#4b5563', // gray-600
  accentColor: '#2563eb', // blue-600
  borders: '1px solid #e5e7eb', // gray-200
  fonts: {
    primary: 'inherit',
    secondary: 'inherit'
  },
  table: {
    headerBackground: '#f3f4f6', // gray-100
    headerText: '#111827', // gray-900
    rowBorder: '1px solid #e5e7eb',
    alternatingBackground: 'transparent',
  }
};
