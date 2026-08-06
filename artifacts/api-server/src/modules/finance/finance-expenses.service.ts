import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { FinanceLedgerService } from './finance-ledger.service.js';
import { FinanceAuditService } from './finance-audit.service.js';
import { FinanceProfitService } from './finance-profit.service.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';
import { addMonths, addQuarters, addYears } from 'date-fns';

// ─── Expense Categories ───────────────────────────────────────────────────────

export const ExpenseCategoriesService = {
  async list() {
    return prisma.expenseCategory.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  },

  async create(data: { name: string }) {
    if (!data.name?.trim()) throw new AppError('Category name is required', 400);
    return prisma.expenseCategory.create({
      data: { name: data.name.trim() },
    });
  },

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    return prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  },
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const FinanceExpensesService = {
  async list(filters: {
    page?: number;
    limit?: number;
    categoryId?: string;
    status?: string;
    accountId?: string;
    isRecurring?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) {
    const { page = 1, limit = 20, categoryId, status, accountId, isRecurring, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

    const where: Prisma.ExpenseWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status as any;
    if (accountId) where.accountId = accountId;
    if (isRecurring !== undefined) where.isRecurring = isRecurring;
    if (dateFrom || dateTo) {
      where.expenseDate = {};
      if (dateFrom) where.expenseDate.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },

  async getById(id: string) {
    const e = await prisma.expense.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        account: { select: { id: true, name: true, type: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
    if (!e) throw new AppError('Expense not found', 404);
    return serialize(e);
  },

  async create(userId: string, data: Record<string, any>) {
    const { categoryId, name, vendor, amount, accountId, expenseDate, description, isRecurring, frequency } = data;

    if (!categoryId) throw new AppError('Category is required', 400);
    if (!name?.trim()) throw new AppError('Expense name is required', 400);
    if (!accountId) throw new AppError('Financial account is required', 400);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new AppError('Amount must be greater than zero', 400);

    const account = await prisma.financeAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('Financial account not found', 404);
    if (account.status !== 'ACTIVE') throw new AppError('Selected account is not active', 400);

    const number = await DocumentNumberService.generateNextNumber({ model: 'expense' as any, prefix: 'EXP', sequenceLength: 6 });
    const amt = Number(amount);
    const eDate = expenseDate ? new Date(expenseDate) : new Date();

    // Calculate nextDueDate for recurring expenses
    let nextDueDate: Date | null = null;
    if (isRecurring && frequency && frequency !== 'ONCE') {
      if (frequency === 'MONTHLY') nextDueDate = addMonths(eDate, 1);
      else if (frequency === 'QUARTERLY') nextDueDate = addQuarters(eDate, 1);
      else if (frequency === 'YEARLY') nextDueDate = addYears(eDate, 1);
    }

    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          number,
          categoryId,
          name: name.trim(),
          vendor: vendor?.trim() || null,
          amount: amt,
          accountId,
          expenseDate: eDate,
          description: description?.trim() || null,
          status: 'PAID',
          isRecurring: Boolean(isRecurring),
          frequency: isRecurring && frequency ? frequency : null,
          nextDueDate,
          createdById: userId,
        },
        include: {
          category: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await FinanceLedgerService.postEntry(tx, {
        accountId,
        entryType: 'EXPENSE',
        debit: amt,
        description: `Expense: ${name.trim()}`,
        referenceNumber: number,
        referenceId: expense.id,
        createdById: userId,
      });

      // Split expense cost equally among all PARTNER_CAPITAL accounts (reduces partner equity)
      // NOTE: Disabled as per user request to show only Gross Profit in Partner Capital
      /*
      await FinanceProfitService.distributeExpenseCost(
        tx,
        expense.id,
        name.trim(),
        number,
        amt,
        userId
      );
      */

      await FinanceAuditService.log(tx, {
        action: 'EXPENSE_CREATED',
        module: 'EXPENSE',
        referenceId: expense.id,
        reference: number,
        amount: amt,
        accountId,
        userId,
        newValue: { name, amount, categoryId, accountId },
      });

      return serialize(expense);
    });
  },

  async update(userId: string, id: string, data: Record<string, any>, reason?: string) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError('Expense not found', 404);

    // Capture old value for audit
    const oldValue = {
      name: existing.name,
      amount: existing.amount.toFixed(3),
      description: existing.description,
    };

    return prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.vendor !== undefined && { vendor: data.vendor?.trim() || null }),
          ...(data.description !== undefined && { description: data.description?.trim() || null }),
          ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        },
        include: {
          category: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await FinanceAuditService.log(tx, {
        action: 'EXPENSE_UPDATED',
        module: 'EXPENSE',
        referenceId: id,
        reference: existing.number,
        accountId: existing.accountId,
        userId,
        oldValue,
        newValue: { name: updated.name, description: updated.description },
        reason,
      });

      return serialize(updated);
    });
  },

  async delete(userId: string, id: string) {
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) throw new AppError('Expense not found', 404);
    // Check removed so PAID expenses can be deleted

    await prisma.$transaction(async (tx) => {
      // 1. Revert partner capital expense share entries if any
      // NOTE: Disabled as per user request to show only Gross Profit in Partner Capital
      // await FinanceProfitService.revertExpenseCost(tx, id);

      // 2. Delete associated ledger entries
      await tx.financeLedger.deleteMany({ where: { referenceId: id } });

      await tx.expense.delete({ where: { id } });
      await FinanceAuditService.log(tx, {
        action: 'EXPENSE_DELETED',
        module: 'EXPENSE',
        referenceId: id,
        reference: existing.number,
        amount: Number(existing.amount),
        accountId: existing.accountId,
        userId,
        oldValue: { number: existing.number, amount: existing.amount.toFixed(3) },
      });
    });
  },
};

// ─── Serializer ───────────────────────────────────────────────────────────────

function serialize(e: any) {
  return {
    id: e.id,
    number: e.number,
    category: e.category,
    name: e.name,
    vendor: e.vendor,
    amount: e.amount.toFixed(3),
    account: e.account,
    expenseDate: e.expenseDate.toISOString(),
    description: e.description,
    status: e.status,
    isRecurring: e.isRecurring,
    frequency: e.frequency,
    nextDueDate: e.nextDueDate?.toISOString() ?? null,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}
