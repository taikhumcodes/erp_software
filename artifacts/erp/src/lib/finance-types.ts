// ─── Finance Module Interfaces ────────────────────────────────────────────────
// These supplement the base types in types.ts

import type { FinanceAccountType, AccountStatus, LedgerEntryType, ExpenseFrequency, ExpenseStatus, EmployeeStatus, SalaryStatus } from './types';
export type { FinanceAccountType, AccountStatus, LedgerEntryType, ExpenseFrequency, ExpenseStatus, EmployeeStatus, SalaryStatus };

export interface FinanceAccount {
  id: string;
  name: string;
  type: FinanceAccountType;
  status: AccountStatus;
  bankName: string | null;
  accountNumber: string | null;
  branch: string | null;
  currency: string;
  openingBalance: string;
  calculatedBalance: string;
  description: string | null;
  isDefault: boolean;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface FinanceLedgerEntry {
  id: string;
  entryType: LedgerEntryType;
  referenceNumber: string | null;
  referenceId: string | null;
  description: string;
  debit: string;
  credit: string;
  runningBalance: string;
  remarks: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface FinanceLedgerResponse {
  account: { id: string; name: string; type: FinanceAccountType; openingBalance: string } | null;
  entries: FinanceLedgerEntry[];
  meta: { total: number; page: number; limit: number; pages: number };
}

export interface MoneyTransfer {
  id: string;
  number: string;
  fromAccount: { id: string; name: string; type: FinanceAccountType };
  toAccount: { id: string; name: string; type: FinanceAccountType };
  amount: string;
  transferDate: string;
  description: string | null;
  referenceNumber: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  number: string;
  category: { id: string; name: string };
  name: string;
  vendor: string | null;
  amount: string;
  account: { id: string; name: string; type: FinanceAccountType };
  expenseDate: string;
  description: string | null;
  status: ExpenseStatus;
  isRecurring: boolean;
  frequency: ExpenseFrequency | null;
  nextDueDate: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  joiningDate: string | null;
  basicSalary: string;
  allowances: string;
  deductions: string;
  status: EmployeeStatus;
  notes: string | null;
  createdAt: string;
}

export interface SalaryRecord {
  id: string;
  number: string;
  employee: { id: string; employeeId: string; name: string; department: string | null };
  month: number;
  year: number;
  basicSalary: string;
  allowances: string;
  deductions: string;
  bonus: string;
  overtime: string;
  netSalary: string;
  account: { id: string; name: string; type: FinanceAccountType } | null;
  status: SalaryStatus;
  paidAt: string | null;
  paidBy: { id: string; name: string } | null;
  notes: string | null;
  createdAt: string;
}

export interface SalaryAdvance {
  id: string;
  number: string;
  employee: { id: string; name: string; employeeId: string };
  amount: string;
  account: { id: string; name: string; type: FinanceAccountType };
  advanceDate: string;
  reason: string | null;
  recovered: boolean;
  createdBy: { id: string; name: string };
  createdAt: string;
}

export interface FinanceAuditLog {
  id: string;
  action: string;
  module: string;
  referenceId: string | null;
  reference: string | null;
  amount: string | null;
  account: { id: string; name: string; type: FinanceAccountType } | null;
  user: { id: string; name: string };
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  reason: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface FinanceAccountCard {
  id: string; name: string; type: FinanceAccountType;
  isDefault: boolean; currency: string; balance: string;
}

export interface FinanceDashboardStats {
  kpis: {
    totalFunds: string; bankBalance: string; cashBalance: string;
    todayCollections: string; todayPayments: string;
    monthlyExpenses: string; pendingSalary: string;
    moneyToReceive: string; moneyToPay: string;
    grossProfit: string; netProfit: string;
  };
  financialPosition: {
    cash: string; bank: string; receivable: string;
    payable: string; availableLiquidity: string;
  };
  accountCards: FinanceAccountCard[];
  latestActivity: {
    payments: Array<{ id: string; type: string; description: string; amount: string; account: string; createdAt: string }>;
    expenses: Array<{ id: string; name: string; amount: string; account: string; createdAt: string }>;
    salary: Array<{ id: string; employee: string; amount: string; account: string; paidAt: string | null }>;
    transfers: Array<{ id: string; from: string; to: string; amount: string; createdAt: string }>;
  };
  expenseSummary: {
    byCategory: Array<{ categoryId: string; categoryName: string; total: string }>;
    monthlyTrend: Array<{ month: string; amount: string }>;
  };
  salarySummary: { totalEmployees: number; paid: number; pending: number; totalPayroll: string };
  cashFlow: { moneyIn: string; moneyOut: string; net: string };
}
