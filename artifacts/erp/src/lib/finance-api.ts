/**
 * Finance API client utility
 * Direct fetch wrapper for all Finance module endpoints
 */
import { api } from './api';

const BASE = '/api/finance';

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body && typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
  
  if (method === 'POST') return api.post(url, body);
  if (method === 'PUT') return api.put(url, body);
  if (method === 'DELETE') return api.delete(url);
  if (method === 'PATCH') return api.patch(url, body);
  
  return api.get(url);
}

export const FinanceAPI = {
  // Accounts
  getAccounts: (params?: string) => authFetch(`${BASE}/accounts${params ? '?' + params : ''}`),
  getAccount: (id: string) => authFetch(`${BASE}/accounts/${id}`),
  createAccount: (data: unknown) => authFetch(`${BASE}/accounts`, { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: unknown) => authFetch(`${BASE}/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeAccountStatus: (id: string, data: unknown) => authFetch(`${BASE}/accounts/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => authFetch(`${BASE}/accounts/${id}`, { method: 'DELETE' }),
  secureArchiveAccount: (id: string, data: unknown) => authFetch(`${BASE}/accounts/${id}/secure-archive`, { method: 'POST', body: JSON.stringify(data) }),
  createAdjustment: (id: string, data: unknown) => authFetch(`${BASE}/accounts/${id}/adjustment`, { method: 'POST', body: JSON.stringify(data) }),

  // Ledger
  getLedger: (accountId: string, params?: string) => authFetch(`${BASE}/ledger/${accountId}${params ? '?' + params : ''}`),
  getStatement: (accountId: string, params?: string) => authFetch(`${BASE}/ledger/${accountId}/statement${params ? '?' + params : ''}`),

  // Transfers
  getTransfers: (params?: string) => authFetch(`${BASE}/transfers${params ? '?' + params : ''}`),
  createTransfer: (data: unknown) => authFetch(`${BASE}/transfers`, { method: 'POST', body: JSON.stringify(data) }),

  // Expense Categories
  getExpenseCategories: () => authFetch(`${BASE}/expenses/categories`),
  createExpenseCategory: (data: unknown) => authFetch(`${BASE}/expenses/categories`, { method: 'POST', body: JSON.stringify(data) }),
  updateExpenseCategory: (id: string, data: unknown) => authFetch(`${BASE}/expenses/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params?: string) => authFetch(`${BASE}/expenses${params ? '?' + params : ''}`),
  getExpense: (id: string) => authFetch(`${BASE}/expenses/${id}`),
  createExpense: (data: unknown) => authFetch(`${BASE}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: unknown) => authFetch(`${BASE}/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => authFetch(`${BASE}/expenses/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: (params?: string) => authFetch(`${BASE}/employees${params ? '?' + params : ''}`),
  getEmployee: (id: string) => authFetch(`${BASE}/employees/${id}`),
  createEmployee: (data: unknown) => authFetch(`${BASE}/employees`, { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: unknown) => authFetch(`${BASE}/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Salary
  getSalaryRecords: (params?: string) => authFetch(`${BASE}/salary${params ? '?' + params : ''}`),
  generateSalary: (data: unknown) => authFetch(`${BASE}/salary/generate`, { method: 'POST', body: JSON.stringify(data) }),
  paySalary: (id: string, data: unknown) => authFetch(`${BASE}/salary/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),

  // Advances
  getAdvances: (params?: string) => authFetch(`${BASE}/advances${params ? '?' + params : ''}`),
  createAdvance: (data: unknown) => authFetch(`${BASE}/advances`, { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboard: () => authFetch(`${BASE}/dashboard`),

  // Audit Logs
  getAuditLogs: (params?: string) => authFetch(`${BASE}/audit-logs${params ? '?' + params : ''}`),
};
