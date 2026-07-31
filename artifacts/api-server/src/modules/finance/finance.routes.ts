import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { FinanceController } from './finance.controller.js';

const router = Router();

// All finance routes require authentication
router.use(authenticate);

// ── Finance Dashboard ─────────────────────────────────────────────────────────
router.get('/dashboard', FinanceController.getDashboard);

// ── Finance Accounts ──────────────────────────────────────────────────────────
router.get('/accounts', FinanceController.listAccounts);
router.get('/accounts/:id', FinanceController.getAccount);
router.post('/accounts', hasMinRole('MANAGER'), FinanceController.createAccount);
router.put('/accounts/:id', hasMinRole('MANAGER'), FinanceController.updateAccount);
router.put('/accounts/:id/status', hasMinRole('MANAGER'), FinanceController.changeAccountStatus);
router.delete('/accounts/:id', hasMinRole('OWNER'), FinanceController.deleteAccount);
router.post('/accounts/:id/secure-archive', hasMinRole('OWNER'), FinanceController.secureArchiveAccount);
router.post('/accounts/:id/adjustment', hasMinRole('MANAGER'), FinanceController.createAdjustment);

// ── Ledger ────────────────────────────────────────────────────────────────────
router.get('/ledger/:accountId', FinanceController.getLedger);
router.get('/ledger/:accountId/statement', FinanceController.getStatement);

// ── Transfers ─────────────────────────────────────────────────────────────────
router.get('/transfers', FinanceController.listTransfers);
router.post('/transfers', hasMinRole('MANAGER'), FinanceController.createTransfer);
router.delete('/transfers/:id', hasMinRole('MANAGER'), FinanceController.deleteTransfer);

// ── Expense Categories ────────────────────────────────────────────────────────
router.get('/expenses/categories', FinanceController.listExpenseCategories);
router.post('/expenses/categories', hasMinRole('MANAGER'), FinanceController.createExpenseCategory);
router.put('/expenses/categories/:id', hasMinRole('MANAGER'), FinanceController.updateExpenseCategory);

// ── Expenses ──────────────────────────────────────────────────────────────────
router.get('/expenses', FinanceController.listExpenses);
router.get('/expenses/:id', FinanceController.getExpense);
router.post('/expenses', hasMinRole('MANAGER'), FinanceController.createExpense);
router.put('/expenses/:id', hasMinRole('MANAGER'), FinanceController.updateExpense);
router.delete('/expenses/:id', hasMinRole('MANAGER'), FinanceController.deleteExpense);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get('/employees', FinanceController.listEmployees);
router.get('/employees/:id', FinanceController.getEmployee);
router.post('/employees', hasMinRole('MANAGER'), FinanceController.createEmployee);
router.put('/employees/:id', hasMinRole('MANAGER'), FinanceController.updateEmployee);

// ── Salary Advances ───────────────────────────────────────────────────────────
router.get('/advances', FinanceController.listAdvances);
router.post('/advances', hasMinRole('MANAGER'), FinanceController.createAdvance);

// ── Salary Records ────────────────────────────────────────────────────────────
router.get('/salary', FinanceController.listSalaryRecords);
router.post('/salary/generate', hasMinRole('MANAGER'), FinanceController.generateSalary);
router.post('/salary/:id/pay', hasMinRole('MANAGER'), FinanceController.paySalary);

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', hasMinRole('MANAGER'), FinanceController.listAuditLogs);

export default router;
