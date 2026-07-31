import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { FinanceAccountsRepository } from './finance-accounts.repository.js';

export const FinanceDashboardService = {
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get all active accounts with their calculated balances
    const accounts = await prisma.financeAccount.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, type: true, isDefault: true, currency: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const accountCards = await Promise.all(accounts.map(async (acc) => {
      const balance = await FinanceAccountsRepository.calculateBalance(acc.id);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        isDefault: acc.isDefault,
        currency: acc.currency,
        balance: balance.toFixed(3),
      };
    }));

    // Aggregate balances by type
    const bankBalance = accountCards
      .filter((a) => a.type === 'BANK')
      .reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const cashBalance = accountCards
      .filter((a) => a.type === 'CASH' || a.type === 'WALLET')
      .reduce((sum, a) => sum + parseFloat(a.balance), 0);
    const totalFunds = accountCards.reduce((sum, a) => sum + parseFloat(a.balance), 0);

    // Today's ledger activity
    const [todayCredits, todayDebits] = await Promise.all([
      prisma.financeLedger.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { credit: true },
      }),
      prisma.financeLedger.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { debit: true },
      }),
    ]);

    // Monthly expenses
    const monthlyExpenses = await prisma.expense.aggregate({
      where: { expenseDate: { gte: monthStart, lte: monthEnd }, status: 'PAID' },
      _sum: { amount: true },
    });

    // Pending salary
    const pendingSalary = await prisma.salaryRecord.aggregate({
      where: { status: 'PENDING' },
      _sum: { netSalary: true },
    });

    // Money to receive / to pay from existing payment system
    const [toReceive, toPay] = await Promise.all([
      prisma.sale.aggregate({ where: { paymentStatus: { not: 'PAID' } }, _sum: { outstandingAmount: true } }),
      prisma.purchase.aggregate({ where: { paymentStatus: { not: 'PAID' } }, _sum: { outstandingAmount: true } }),
    ]);

    // Cash flow this month
    const [monthCredits, monthDebits] = await Promise.all([
      prisma.financeLedger.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { credit: true },
      }),
      prisma.financeLedger.aggregate({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { debit: true },
      }),
    ]);

    const moneyIn = Number(monthCredits._sum.credit ?? 0);
    const moneyOut = Number(monthDebits._sum.debit ?? 0);

    // Latest activity (last 8 of each type)
    const [latestPayments, latestExpenses, latestSalary, latestTransfers] = await Promise.all([
      prisma.financeLedger.findMany({
        where: { entryType: { in: ['SALE_PAYMENT', 'PURCHASE_PAYMENT'] } },
        include: { account: { select: { name: true } }, createdBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.expense.findMany({
        include: { category: { select: { name: true } }, account: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.salaryRecord.findMany({
        where: { status: 'PAID' },
        include: { employee: { select: { name: true } }, account: { select: { name: true } } },
        orderBy: { paidAt: 'desc' },
        take: 8,
      }),
      prisma.moneyTransfer.findMany({
        include: {
          fromAccount: { select: { name: true } },
          toAccount: { select: { name: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    // Expense summary by category (this month)
    const expenseByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      where: { expenseDate: { gte: monthStart, lte: monthEnd }, status: 'PAID' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    });
    const categoryIds = expenseByCategory.map((e) => e.categoryId);
    const categories = await prisma.expenseCategory.findMany({ where: { id: { in: categoryIds } } });
    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

    // Monthly expense trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const agg = await prisma.expense.aggregate({
        where: { expenseDate: { gte: start, lte: end }, status: 'PAID' },
        _sum: { amount: true },
      });
      monthlyTrend.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        amount: (agg._sum.amount ?? new Prisma.Decimal(0)).toFixed(3),
      });
    }

    // Salary summary
    const [totalEmployees, paidSalaries, pendingSalaries] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),
      prisma.salaryRecord.count({ where: { status: 'PAID', year: now.getFullYear(), month: now.getMonth() + 1 } }),
      prisma.salaryRecord.count({ where: { status: 'PENDING', year: now.getFullYear(), month: now.getMonth() + 1 } }),
    ]);
    const totalPayroll = await prisma.salaryRecord.aggregate({
      where: { year: now.getFullYear(), month: now.getMonth() + 1 },
      _sum: { netSalary: true },
    });

    return {
      kpis: {
        totalFunds: totalFunds.toFixed(3),
        bankBalance: bankBalance.toFixed(3),
        cashBalance: cashBalance.toFixed(3),
        todayCollections: (todayCredits._sum.credit ?? new Prisma.Decimal(0)).toFixed(3),
        todayPayments: (todayDebits._sum.debit ?? new Prisma.Decimal(0)).toFixed(3),
        monthlyExpenses: (monthlyExpenses._sum.amount ?? new Prisma.Decimal(0)).toFixed(3),
        pendingSalary: (pendingSalary._sum.netSalary ?? new Prisma.Decimal(0)).toFixed(3),
        moneyToReceive: (toReceive._sum.outstandingAmount ?? new Prisma.Decimal(0)).toFixed(3),
        moneyToPay: (toPay._sum.outstandingAmount ?? new Prisma.Decimal(0)).toFixed(3),
      },
      financialPosition: {
        cash: cashBalance.toFixed(3),
        bank: bankBalance.toFixed(3),
        receivable: (toReceive._sum.outstandingAmount ?? new Prisma.Decimal(0)).toFixed(3),
        payable: (toPay._sum.outstandingAmount ?? new Prisma.Decimal(0)).toFixed(3),
        availableLiquidity: totalFunds.toFixed(3),
      },
      accountCards,
      latestActivity: {
        payments: latestPayments.map((e) => ({
          id: e.id,
          type: e.entryType,
          description: e.description,
          amount: e.entryType === 'SALE_PAYMENT' ? `+${e.credit.toFixed(3)}` : `-${e.debit.toFixed(3)}`,
          account: e.account.name,
          createdAt: e.createdAt.toISOString(),
        })),
        expenses: latestExpenses.map((e) => ({
          id: e.id,
          name: e.name,
          amount: e.amount.toFixed(3),
          account: e.account.name,
          createdAt: e.createdAt.toISOString(),
        })),
        salary: latestSalary.map((s) => ({
          id: s.id,
          employee: s.employee.name,
          amount: s.netSalary.toFixed(3),
          account: s.account?.name ?? '-',
          paidAt: s.paidAt?.toISOString() ?? null,
        })),
        transfers: latestTransfers.map((t) => ({
          id: t.id,
          from: t.fromAccount.name,
          to: t.toAccount.name,
          amount: t.amount.toFixed(3),
          createdAt: t.createdAt.toISOString(),
        })),
      },
      expenseSummary: {
        byCategory: expenseByCategory.map((e) => ({
          categoryId: e.categoryId,
          categoryName: categoryMap[e.categoryId] ?? 'Unknown',
          total: (e._sum.amount ?? new Prisma.Decimal(0)).toFixed(3),
        })),
        monthlyTrend,
      },
      salarySummary: {
        totalEmployees,
        paid: paidSalaries,
        pending: pendingSalaries,
        totalPayroll: (totalPayroll._sum.netSalary ?? new Prisma.Decimal(0)).toFixed(3),
      },
      cashFlow: {
        moneyIn: moneyIn.toFixed(3),
        moneyOut: moneyOut.toFixed(3),
        net: (moneyIn - moneyOut).toFixed(3),
      },
    };
  },
};
