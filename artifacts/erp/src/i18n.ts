import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const en = {
  translation: {
    app_name: 'Al-Bunyan ERP',
    dashboard: 'Dashboard',
    inventory: 'INVENTORY',
    products: 'Products',
    categories: 'Categories',
    brands: 'Brands',
    units: 'Units',
    transactions: 'TRANSACTIONS',
    purchases: 'Purchases',
    sales: 'Sales',
    delivery_orders: 'Delivery Orders',
    contacts: 'CONTACTS',
    customers: 'Customers',
    suppliers: 'Suppliers',
    finance: 'FINANCE',
    payments: 'Payments',
    reports: 'Reports',
    system: 'SYSTEM',
    users: 'Users',
    settings: 'Settings',
    coming_soon: 'Coming soon',
    login: 'Log in',
    email: 'Email',
    password: 'Password',
    sign_in: 'Sign In',
    logging_in: 'Signing In...',
    logout: 'Log out',
    kpi_purchases: 'Total Purchases',
    kpi_sales: 'Total Sales',
    kpi_customers: 'Active Customers',
    kpi_suppliers: 'Active Suppliers',
    recent_activity: 'Recent Activity',
    role_owner: 'Owner',
    role_admin: 'Admin',
    role_manager: 'Manager',
    role_sales: 'Sales',
    role_warehouse: 'Warehouse',
    name: 'Name',
    role: 'Role',
    status: 'Status',
    created_at: 'Created At',
    active: 'Active',
    inactive: 'Inactive',
    language_region: 'Language & Region',
    company_information: 'Company Information',
    company_name: 'Company Name',
    address: 'Address',
    phone: 'Phone',
    language: 'Language',
    currency: 'Currency',
    save_changes: 'Save Changes',
    kwd: 'Kuwaiti Dinar (KWD) - 3 Decimals',
    english: 'English',
    arabic: 'Arabic',
    welcome_back: 'Welcome back',
    enter_credentials: 'Enter your credentials to access your account'
  }
};

// Arabic translations
const ar = {
  translation: {
    app_name: 'نظام البنيان ERP',
    dashboard: 'لوحة القيادة',
    inventory: 'المخزون',
    products: 'المنتجات',
    categories: 'الفئات',
    brands: 'العلامات التجارية',
    units: 'الوحدات',
    transactions: 'المعاملات',
    purchases: 'المشتريات',
    sales: 'المبيعات',
    delivery_orders: 'أوامر التوصيل',
    contacts: 'جهات الاتصال',
    customers: 'العملاء',
    suppliers: 'الموردين',
    finance: 'المالية',
    payments: 'المدفوعات',
    reports: 'التقارير',
    system: 'النظام',
    users: 'المستخدمين',
    settings: 'الإعدادات',
    coming_soon: 'قريباً',
    login: 'تسجيل الدخول',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    sign_in: 'دخول',
    logging_in: 'جاري الدخول...',
    logout: 'تسجيل خروج',
    kpi_purchases: 'إجمالي المشتريات',
    kpi_sales: 'إجمالي المبيعات',
    kpi_customers: 'العملاء النشطين',
    kpi_suppliers: 'الموردين النشطين',
    recent_activity: 'الأنشطة الأخيرة',
    role_owner: 'المالك',
    role_admin: 'مسؤول',
    role_manager: 'مدير',
    role_sales: 'مبيعات',
    role_warehouse: 'مستودع',
    name: 'الاسم',
    role: 'الدور',
    status: 'الحالة',
    created_at: 'تاريخ الإنشاء',
    active: 'نشط',
    inactive: 'غير نشط',
    language_region: 'اللغة والمنطقة',
    company_information: 'معلومات الشركة',
    company_name: 'اسم الشركة',
    address: 'العنوان',
    phone: 'رقم الهاتف',
    language: 'اللغة',
    currency: 'العملة',
    save_changes: 'حفظ التغييرات',
    kwd: 'دينار كويتي (KWD) - ٣ أرقام عشرية',
    english: 'الإنجليزية',
    arabic: 'العربية',
    welcome_back: 'مرحباً بعودتك',
    enter_credentials: 'أدخل بيانات الاعتماد الخاصة بك للوصول إلى حسابك'
  }
};

const savedLang = localStorage.getItem('erp_lang') || 'en';

if (savedLang === 'ar') {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
} else {
  document.documentElement.dir = 'ltr';
  document.documentElement.lang = 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      ar
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
