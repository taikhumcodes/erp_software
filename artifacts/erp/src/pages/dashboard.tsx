import { useTranslation } from 'react-i18next';
import { 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  Truck,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: user } = useGetCurrentUser({
    query: {
      queryKey: getGetCurrentUserQueryKey()
    }
  });

  const kpis = [
    {
      title: t('kpi_purchases'),
      value: 'KD 0.000',
      change: '+12.5%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: t('kpi_sales'),
      value: 'KD 0.000',
      change: '+8.2%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: t('kpi_customers'),
      value: '0',
      change: '+4.1%',
      trend: 'up',
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/20'
    },
    {
      title: t('kpi_suppliers'),
      value: '0',
      change: '-2.4%',
      trend: 'down',
      icon: Truck,
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/20'
    }
  ];

  const recentActivity = [
    { id: 1, action: 'Sales Order #SO-2024-089 created', user: 'Ahmed K.', time: '10 mins ago', status: 'completed' },
    { id: 2, action: 'Purchase Order #PO-2024-045 approved', user: 'Sarah M.', time: '1 hour ago', status: 'approved' },
    { id: 3, action: 'Delivery Order #DO-2024-112 dispatched', user: 'Mohammed Ali', time: '2 hours ago', status: 'dispatched' },
    { id: 4, action: 'New Customer "Gulf Contracting" added', user: 'Ahmed K.', time: '3 hours ago', status: 'completed' },
    { id: 5, action: 'Payment received for #SO-2024-082', user: 'Fatima H.', time: '5 hours ago', status: 'completed' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard')}</h1>
        {user && (
          <p className="text-muted-foreground mt-1">
            {t('welcome_back')}, {user.name}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-card border rounded-lg p-5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <h3 className="text-2xl font-bold text-foreground mt-2" dir="ltr">{kpi.value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${kpi.bg}`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500 mr-1 rtl:ml-1 rtl:mr-0" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500 mr-1 rtl:ml-1 rtl:mr-0" />
                )}
                <span className={kpi.trend === 'up' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'} dir="ltr">
                  {kpi.change}
                </span>
                <span className="text-muted-foreground ml-2 rtl:mr-2 rtl:ml-0">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-foreground">{t('recent_activity')}</h3>
        </div>
        <div className="divide-y">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-2 rtl:space-x-reverse">
                  <span>{activity.user}</span>
                  <span>•</span>
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
