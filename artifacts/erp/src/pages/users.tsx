import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

export default function Users() {
  const { t } = useTranslation();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'OWNER': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ADMIN': return 'bg-red-100 text-red-800 border-red-200';
      case 'MANAGER': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SALES': return 'bg-green-100 text-green-800 border-green-200';
      case 'WAREHOUSE': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const users = [
    { id: '1', name: 'Abdullah Al-Rashid', email: 'abdullah@albunyan.com', role: 'OWNER', status: 'Active', createdAt: '2024-01-15' },
    { id: '2', name: 'Mohammed Salah', email: 'mohammed@albunyan.com', role: 'MANAGER', status: 'Active', createdAt: '2024-02-01' },
    { id: '3', name: 'Tariq Hussain', email: 'tariq@albunyan.com', role: 'SALES', status: 'Active', createdAt: '2024-02-15' },
    { id: '4', name: 'Faisal Kamal', email: 'faisal@albunyan.com', role: 'WAREHOUSE', status: 'Active', createdAt: '2024-03-10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">{t('users')}</h1>
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors shadow-sm flex items-center">
          <Plus className="w-4 h-4 mr-2 rtl:ml-2 rtl:mr-0" />
          Add User
        </button>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left rtl:text-right">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">{t('name')}</th>
                <th className="px-6 py-4 font-medium">{t('email')}</th>
                <th className="px-6 py-4 font-medium">{t('role')}</th>
                <th className="px-6 py-4 font-medium">{t('status')}</th>
                <th className="px-6 py-4 font-medium">{t('created_at')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}>
                      {t(`role_${user.role.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 rtl:ml-1.5 rtl:mr-0"></span>
                      {t('active')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground" dir="ltr">{user.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
