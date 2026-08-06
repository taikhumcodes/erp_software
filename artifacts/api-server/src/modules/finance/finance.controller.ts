import type { Request, Response, NextFunction } from 'express';
import { FinanceAccountsService } from './finance-accounts.service.js';
import { FinanceLedgerService } from './finance-ledger.service.js';
import { FinanceTransfersService } from './finance-transfers.service.js';
import { FinanceExpensesService, ExpenseCategoriesService } from './finance-expenses.service.js';
import { EmployeeService, SalaryService } from './finance-salary.service.js';
import { FinanceAuditService } from './finance-audit.service.js';
import { FinanceDashboardService } from './finance-dashboard.service.js';

export const FinanceController = {

  // ── Accounts ───────────────────────────────────────────────────────────────

  async listAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query['status'] ? String(req.query['status']) : undefined;
      const type = req.query['type'] ? String(req.query['type']) : undefined;
      const data = await FinanceAccountsService.list({ status, type } as any);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async getAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinanceAccountsService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceAccountsService.create(userId, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceAccountsService.update(userId, req.params.id as string, req.body as Record<string, any>);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async changeAccountStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = req.body as { status: string; reason?: string };
      const data = await FinanceAccountsService.changeStatus(userId, req.params.id as string, body.status, body.reason);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await FinanceAccountsService.delete(userId, req.params.id as string);
      res.json({ message: 'Account deleted successfully' });
    } catch (err) { next(err); }
  },

  async secureArchiveAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceAccountsService.secureArchive(userId, req.params.id as string, req.body as any);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceAccountsService.createAdjustment(userId, req.params.id as string, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  // ── Ledger ─────────────────────────────────────────────────────────────────

  async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId as string;
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = Math.min(100, parseInt(String(req.query['limit'] ?? '50'), 10) || 50);
      const data = await FinanceLedgerService.getLedger(accountId, {
        page, limit,
        dateFrom: req.query['dateFrom'] ? String(req.query['dateFrom']) : undefined,
        dateTo: req.query['dateTo'] ? String(req.query['dateTo']) : undefined,
        entryType: req.query['entryType'] ? String(req.query['entryType']) as any : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async getStatement(req: Request, res: Response, next: NextFunction) {
    try {
      const accountId = req.params.accountId as string;
      const data = await FinanceLedgerService.generateStatement(
        accountId,
        req.query['dateFrom'] ? String(req.query['dateFrom']) : undefined,
        req.query['dateTo'] ? String(req.query['dateTo']) : undefined,
      );
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── Transfers ──────────────────────────────────────────────────────────────

  async listTransfers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10) || 20;
      const accountId = req.query['accountId'] ? String(req.query['accountId']) : undefined;
      const data = await FinanceTransfersService.list({ page, limit, accountId });
      res.json(data);
    } catch (err) { next(err); }
  },

  async createTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceTransfersService.create(userId, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async deleteTransfer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await FinanceTransfersService.delete(userId, req.params['id'] as string);
      res.status(204).end();
    } catch (err) { next(err); }
  },

  // ── Expense Categories ─────────────────────────────────────────────────────

  async listExpenseCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpenseCategoriesService.list();
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createExpenseCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpenseCategoriesService.create(req.body as { name: string });
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async updateExpenseCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExpenseCategoriesService.update(req.params.id as string, req.body as any);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── Expenses ───────────────────────────────────────────────────────────────

  async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10) || 20;
      const data = await FinanceExpensesService.list({
        page, limit,
        categoryId: req.query['categoryId'] ? String(req.query['categoryId']) : undefined,
        status: req.query['status'] ? String(req.query['status']) : undefined,
        accountId: req.query['accountId'] ? String(req.query['accountId']) : undefined,
        isRecurring: req.query['isRecurring'] === 'true' ? true : req.query['isRecurring'] === 'false' ? false : undefined,
        dateFrom: req.query['dateFrom'] ? String(req.query['dateFrom']) : undefined,
        dateTo: req.query['dateTo'] ? String(req.query['dateTo']) : undefined,
        sortBy: req.query['sortBy'] ? String(req.query['sortBy']) : undefined,
        sortOrder: req.query['sortOrder'] === 'asc' ? 'asc' : 'desc',
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async getExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinanceExpensesService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await FinanceExpensesService.create(userId, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const body = req.body as Record<string, any>;
      const data = await FinanceExpensesService.update(userId, req.params.id as string, body, body.reason);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async deleteExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      await FinanceExpensesService.delete(userId, req.params.id as string);
      res.json({ message: 'Expense deleted successfully' });
    } catch (err) { next(err); }
  },

  // ── Employees ──────────────────────────────────────────────────────────────

  async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query['status'] ? String(req.query['status']) : undefined;
      const data = await EmployeeService.list({ status });
      res.json({ data });
    } catch (err) { next(err); }
  },

  async getEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.getById(req.params.id as string);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.create(req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await EmployeeService.update(req.params.id as string, req.body as Record<string, any>);
      res.json({ data });
    } catch (err) { next(err); }
  },

  async createAdvance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await SalaryService.createAdvance(userId, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async listAdvances(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10) || 20;
      const employeeId = req.query['employeeId'] ? String(req.query['employeeId']) : undefined;
      const data = await SalaryService.listAdvances({ page, limit, employeeId });
      res.json(data);
    } catch (err) { next(err); }
  },

  // ── Salary ─────────────────────────────────────────────────────────────────

  async listSalaryRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10) || 20;
      const data = await SalaryService.listRecords({
        page, limit,
        employeeId: req.query['employeeId'] ? String(req.query['employeeId']) : undefined,
        month: req.query['month'] ? parseInt(String(req.query['month']), 10) : undefined,
        year: req.query['year'] ? parseInt(String(req.query['year']), 10) : undefined,
        status: req.query['status'] ? String(req.query['status']) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async generateSalary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await SalaryService.generate(userId, req.body as Record<string, any>);
      res.status(201).json({ data });
    } catch (err) { next(err); }
  },

  async paySalary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await SalaryService.pay(userId, req.params.id as string, req.body as Record<string, any>);
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinanceDashboardService.getStats();
      res.json({ data });
    } catch (err) { next(err); }
  },

  // ── Audit Logs ─────────────────────────────────────────────────────────────

  async listAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '50'), 10) || 50;
      const data = await FinanceAuditService.list({
        page, limit,
        action: req.query['action'] ? String(req.query['action']) : undefined,
        module: req.query['module'] ? String(req.query['module']) : undefined,
        userId: req.query['userId'] ? String(req.query['userId']) : undefined,
        accountId: req.query['accountId'] ? String(req.query['accountId']) : undefined,
        dateFrom: req.query['dateFrom'] ? String(req.query['dateFrom']) : undefined,
        dateTo: req.query['dateTo'] ? String(req.query['dateTo']) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },
};
