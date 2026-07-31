import { Card, CardContent } from '@/components/ui/card';
import { BarChart3, TrendingUp, Receipt, Users, Clock, AlertCircle } from 'lucide-react';

export default function FinanceReports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and view detailed financial analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Income Statement (P&L)', icon: TrendingUp, desc: 'Revenues, expenses and profits over a specific period.' },
          { title: 'Cash Flow Statement', icon: BarChart3, desc: 'Detailed breakdown of money flowing in and out.' },
          { title: 'Expense Analysis', icon: Receipt, desc: 'Expenses categorized by type and vendor.' },
          { title: 'Payroll Summary', icon: Users, desc: 'Employee salary costs, deductions and advances.' },
          { title: 'Account Balances', icon: Clock, desc: 'Historical balances across all active accounts.' },
        ].map(r => (
          <Card key={r.title} className="hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary/20">
            <CardContent className="p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <r.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-1">{r.title}</h3>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 text-blue-800 rounded-lg flex items-start gap-4 border border-blue-100">
        <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Advanced Reporting Module Coming Soon</h4>
          <p className="text-sm mt-1 opacity-90">
            The advanced reporting engine with custom date ranges, PDF generation, and Excel exports is currently under development and will be available in the next release. For now, you can use the Dashboard and Ledger pages for real-time financial tracking.
          </p>
        </div>
      </div>
    </div>
  );
}
