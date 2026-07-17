import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useLogout, useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { useAuthStore } from '@/lib/store';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Tag, 
  Scale, 
  ShoppingCart, 
  Banknote, 
  Truck, 
  Users, 
  Contact, 
  CreditCard, 
  FileText, 
  Settings as SettingsIcon,
  LogOut,
  Box,
  ChevronRight,
  Menu
} from 'lucide-react';
import { useState } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { t, i18n } = useTranslation();
  const logoutMutation = useLogout();
  const logout = useAuthStore(state => state.logout);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: user } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey()
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        logout();
        setLocation('/login');
      }
    });
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
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

  const navigation = [
    {
      items: [
        { name: t('dashboard'), path: '/', icon: LayoutDashboard, disabled: false }
      ]
    },
    {
      label: t('inventory'),
      items: [
        { name: t('products'), path: '/products', icon: Package, disabled: true },
        { name: t('categories'), path: '/categories', icon: Tags, disabled: true },
        { name: t('brands'), path: '/brands', icon: Tag, disabled: true },
        { name: t('units'), path: '/units', icon: Scale, disabled: true }
      ]
    },
    {
      label: t('transactions'),
      items: [
        { name: t('purchases'), path: '/purchases', icon: ShoppingCart, disabled: true },
        { name: t('sales'), path: '/sales', icon: Banknote, disabled: true },
        { name: t('delivery_orders'), path: '/delivery-orders', icon: Truck, disabled: true }
      ]
    },
    {
      label: t('contacts'),
      items: [
        { name: t('customers'), path: '/customers', icon: Users, disabled: true },
        { name: t('suppliers'), path: '/suppliers', icon: Contact, disabled: true }
      ]
    },
    {
      label: t('finance'),
      items: [
        { name: t('payments'), path: '/payments', icon: CreditCard, disabled: true },
        { name: t('reports'), path: '/reports', icon: FileText, disabled: true }
      ]
    },
    {
      label: t('system'),
      items: [
        { name: t('users'), path: '/users', icon: Users, disabled: false },
        { name: t('settings'), path: '/settings', icon: SettingsIcon, disabled: false }
      ]
    }
  ];

  // Derive breadcrumb from path
  const getBreadcrumb = () => {
    if (location === '/') return t('dashboard');
    if (location === '/users') return t('users');
    if (location === '/settings') return t('settings');
    return '';
  };

  return (
    <div className="flex h-[100dvh] bg-background">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed xl:static inset-y-0 start-0 z-50 w-[240px] bg-sidebar border-r rtl:border-r-0 rtl:border-l flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
        }`}
      >
        <div className="h-[60px] flex items-center px-6 border-b shrink-0">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center mr-3 rtl:ml-3 rtl:mr-0">
            <Box className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-sidebar-foreground whitespace-nowrap overflow-hidden">
            {t('app_name')}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-gray-200">
          {navigation.map((section, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {section.label && (
                <h4 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {section.label}
                </h4>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <li key={item.path}>
                      {item.disabled ? (
                        <div 
                          className="flex items-center px-3 py-2 text-sm text-sidebar-foreground opacity-45 cursor-not-allowed group relative"
                          title={t('coming_soon')}
                        >
                          <Icon className="w-4 h-4 mr-3 rtl:ml-3 rtl:mr-0 shrink-0" />
                          <span className="truncate">{item.name}</span>
                          
                          {/* Tooltip for disabled items */}
                          <div className="absolute hidden group-hover:block left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded z-50 whitespace-nowrap rtl:left-auto rtl:right-full rtl:mr-2 rtl:ml-0">
                            {t('coming_soon')}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setLocation(item.path);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 text-sm rounded-md transition-colors ${
                            isActive 
                              ? 'bg-primary/10 text-primary font-medium rtl:border-r-4 ltr:border-l-4 border-primary' 
                              : 'text-sidebar-foreground hover:bg-sidebar-accent rtl:border-r-4 ltr:border-l-4 border-transparent'
                          }`}
                        >
                          <Icon className={`w-4 h-4 mr-3 rtl:ml-3 rtl:mr-0 shrink-0 ${isActive ? 'text-primary' : ''}`} />
                          <span className="truncate">{item.name}</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-[60px] bg-background border-b flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
          <div className="flex items-center">
            <button 
              className="mr-4 p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-md xl:hidden rtl:ml-4 rtl:-mr-2 rtl:mr-0"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center text-sm">
              <span className="text-muted-foreground">{t('app_name')}</span>
              <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground rtl:rotate-180" />
              <span className="font-medium text-foreground">{getBreadcrumb()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <button 
              onClick={toggleLanguage}
              className="text-sm font-medium px-3 py-1.5 rounded hover:bg-accent transition-colors"
            >
              {i18n.language === 'en' ? 'عربي' : 'English'}
            </button>
            
            <div className="h-6 w-px bg-border hidden sm:block"></div>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="hidden sm:flex flex-col items-end rtl:items-start text-sm">
                <span className="font-medium text-foreground">{user?.name || 'Loading...'}</span>
                <span className="text-xs text-muted-foreground">
                  {user ? t(`role_${user.role.toLowerCase()}`) : ''}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div className="h-6 w-px bg-border"></div>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              title={t('logout')}
            >
              <LogOut className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-[#F8FAFC] dark:bg-background">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
