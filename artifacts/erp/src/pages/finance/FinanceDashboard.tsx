import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, DollarSign, Building2, Wallet, Clock,
  ArrowLeftRight, Receipt, Users, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FinanceAPI } from '@/lib/finance-api';
import type { FinanceDashboardStats, FinanceAccountCard } from '@/lib/finance-types';

const fmt = (v: string | number) => `KWD ${Number(v).toLocaleString('en-KW', { minimumFractionDigits: 3 })}`;

const ACCOUNT_COLORS: Record<string, string> = {
  CASH:   'bg-emerald-50 border-emerald-200 text-emerald-700',
  BANK:   'bg-blue-50 border-blue-200 text-blue-700',
  WALLET: 'bg-violet-50 border-violet-200 text-violet-700',
  OTHER:  'bg-gray-50 border-gray-200 text-gray-700',
};

export default function FinanceDashboard() {
  const [, setLocation] = useLocation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: () => FinanceAPI.getDashboard(),
    refetchInterval: 60_000,
  });

  const stats: FinanceDashboardStats | undefined = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">Failed to load Finance Dashboard</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const { kpis, financialPosition, accountCards, latestActivity, expenseSummary, salarySummary, cashFlow } = stats;

  const kpiCards = [
    { label: 'Total Funds',        value: fmt(kpis.totalFunds),        icon: DollarSign, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Bank Balance',       value: fmt(kpis.bankBalance),       icon: Building2,  color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Cash Balance',       value: fmt(kpis.cashBalance),       icon: Wallet,     color: 'text-emerald-600',bg: 'bg-emerald-50'},
    { label: "Today's Collections",value: fmt(kpis.todayCollections),  icon: TrendingUp, color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: "Today's Payments",   value: fmt(kpis.todayPayments),     icon: TrendingDown,color:'text-red-600',    bg: 'bg-red-50'    },
    { label: 'Monthly Expenses',   value: fmt(kpis.monthlyExpenses),   icon: Receipt,    color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Pending Salary',     value: fmt(kpis.pendingSalary),     icon: Users,      color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Money to Receive',   value: fmt(kpis.moneyToReceive),    icon: Clock,      color: 'text-amber-600',  bg: 'bg-amber-50'  },
    { label: 'Money to Pay',       value: fmt(kpis.moneyToPay),        icon: Clock,      color: 'text-rose-600',   bg: 'bg-rose-50'   },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time financial overview</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{kpi.label}</p>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Position + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Position Widget */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Financial Position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Cash',               value: financialPosition.cash,               color: 'text-emerald-600' },
              { label: 'Bank',               value: financialPosition.bank,               color: 'text-blue-600' },
              { label: 'Receivable',         value: financialPosition.receivable,         color: 'text-amber-600' },
              { label: 'Payable',            value: financialPosition.payable,            color: 'text-red-600' },
              { label: 'Available Liquidity',value: financialPosition.availableLiquidity, color: 'text-green-700', bold: true },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between py-2 ${item.bold ? 'border-t mt-1 pt-3' : ''}`}>
                <span className={`text-sm ${item.bold ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
                <span className={`text-sm font-bold ${item.color}`}>{fmt(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cash Flow */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Cash Flow — This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Money In',  value: cashFlow.moneyIn,  color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Money Out', value: cashFlow.moneyOut, color: 'text-red-600',   bg: 'bg-red-50'   },
                { label: 'Net',       value: cashFlow.net,      color: Number(cashFlow.net) >= 0 ? 'text-green-700' : 'text-red-700', bg: Number(cashFlow.net) >= 0 ? 'bg-green-50' : 'bg-red-50' },
              ].map((cf) => (
                <div key={cf.label} className={`${cf.bg} rounded-lg p-3 text-center`}>
                  <p className="text-xs text-muted-foreground">{cf.label}</p>
                  <p className={`text-base font-bold mt-1 ${cf.color}`}>{fmt(cf.value)}</p>
                </div>
              ))}
            </div>
            {expenseSummary.monthlyTrend.length > 0 && (
              <div className="h-40 mt-4">
                <p className="text-xs text-muted-foreground mb-2">Monthly Expense Trend</p>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={expenseSummary.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => [`KWD ${Number(v).toFixed(3)}`, 'Expenses']} />
                    <Line type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Account Cards */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Account Balances</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setLocation('/finance/accounts')}>
            Manage Accounts
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountCards.map((acc: FinanceAccountCard) => (
              <button
                key={acc.id}
                onClick={() => setLocation(`/finance/ledger/${acc.id}`)}
                className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${ACCOUNT_COLORS[acc.type] ?? ACCOUNT_COLORS.OTHER}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase opacity-70">{acc.type}</p>
                    <p className="font-semibold mt-0.5">{acc.name}</p>
                  </div>
                  {acc.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                </div>
                <p className="text-xl font-bold mt-3">{fmt(acc.balance)}</p>
              </button>
            ))}
            {accountCards.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-3 text-center py-6">
                No active accounts. <button className="text-primary underline" onClick={() => setLocation('/finance/accounts')}>Add Account</button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Summary + Salary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Category */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Expenses This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseSummary.byCategory.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expenseSummary.byCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="categoryName" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(v: any) => [`KWD ${Number(v).toFixed(3)}`, '']} />
                    <Bar dataKey="total" fill="#f97316" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No expenses this month</p>
            )}
          </CardContent>
        </Card>

        {/* Salary Summary */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Salary — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setLocation('/finance/salary')}>
              Manage
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{salarySummary.totalEmployees}</p>
              </div>
              <div className="bg-violet-50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground">Total Payroll</p>
                <p className="text-lg font-bold text-violet-700 mt-1">{fmt(salarySummary.totalPayroll)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-700">{salarySummary.paid}</p>
              </div>
              <div className="flex-1 text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-amber-700">{salarySummary.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Activity */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Latest Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expenses */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Recent Expenses</p>
              <div className="space-y-2">
                {latestActivity.expenses.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.account} · {new Date(e.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600">-{fmt(e.amount)}</span>
                  </div>
                ))}
                {latestActivity.expenses.length === 0 && <p className="text-sm text-muted-foreground">No recent expenses</p>}
              </div>
            </div>

            {/* Transfers */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Recent Transfers</p>
              <div className="space-y-2">
                {latestActivity.transfers.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.from} → {t.to}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">{fmt(t.amount)}</span>
                  </div>
                ))}
                {latestActivity.transfers.length === 0 && <p className="text-sm text-muted-foreground">No recent transfers</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
