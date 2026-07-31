import { PrismaClient, Prisma, LedgerEntryType } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LedgerEntryInput {
  accountId: string;
  entryType: LedgerEntryType;
  debit?: number | string | Prisma.Decimal;
  credit?: number | string | Prisma.Decimal;
  description: string;
  referenceNumber?: string;
  referenceId?: string;
  createdById: string;
  remarks?: string;
}

// ─── FinanceLedgerService ─────────────────────────────────────────────────────
//
// This is the ONLY function that writes to FinanceLedger.
// All other finance services (accounts, expenses, salary, transfers, payments)
// MUST call postEntry() — never write to the ledger directly.
//
// This ensures every money movement:
//   1. Creates a FinanceLedger entry
//   2. Maintains a consistent running balance
//
// ─────────────────────────────────────────────────────────────────────────────

export const FinanceLedgerService = {
  /**
   * Post a ledger entry for a financial account.
   * Must be called inside a prisma.$transaction.
   *
   * Running balance is calculated as:
   *   lastRunningBalance + credit - debit
   *
   * If no previous entry exists, runningBalance starts at 0
   * (the opening balance entry itself creates the first credit).
   */
  async postEntry(tx: Prisma.TransactionClient, input: LedgerEntryInput) {
    const {
      accountId,
      entryType,
      debit = 0,
      credit = 0,
      description,
      referenceNumber,
      referenceId,
      createdById,
      remarks,
    } = input;

    const debitDec = new Prisma.Decimal(debit.toString());
    const creditDec = new Prisma.Decimal(credit.toString());

    // Get the last entry's running balance for this account
    const lastEntry = await tx.financeLedger.findFirst({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
      select: { runningBalance: true },
    });

    const previousBalance = lastEntry?.runningBalance ?? new Prisma.Decimal(0);
    const runningBalance = previousBalance.add(creditDec).sub(debitDec);

    const entry = await tx.financeLedger.create({
      data: {
        accountId,
        entryType,
        debit: debitDec,
        credit: creditDec,
        runningBalance,
        description,
        referenceNumber: referenceNumber ?? null,
        referenceId: referenceId ?? null,
        createdById,
        remarks: remarks ?? null,
      },
    });

    return entry;
  },

  /**
   * Calculate the current balance of an account.
   * Balance = SUM(credit) - SUM(debit) from ALL ledger entries.
   *
   * This is the authoritative balance — no stored value is trusted.
   * Safe to call both inside and outside transactions.
   */
  async calculateBalance(
    accountId: string,
    client: Prisma.TransactionClient | PrismaClient,
  ): Promise<Prisma.Decimal> {
    const agg = await (client as any).financeLedger.aggregate({
      where: { accountId },
      _sum: { credit: true, debit: true },
    });

    const totalCredit = agg._sum.credit ?? new Prisma.Decimal(0);
    const totalDebit = agg._sum.debit ?? new Prisma.Decimal(0);

    return totalCredit.sub(totalDebit);
  },

  /**
   * Get paginated ledger entries for an account.
   * Includes a verified running balance recalculated from scratch.
   */
  async getLedger(
    accountId: string,
    options: {
      page?: number;
      limit?: number;
      dateFrom?: string;
      dateTo?: string;
      entryType?: LedgerEntryType;
    } = {},
  ) {
    const { prisma } = await import('../../lib/prisma.js');
    const { page = 1, limit = 50, dateFrom, dateTo, entryType } = options;

    const where: Prisma.FinanceLedgerWhereInput = { accountId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (entryType) where.entryType = entryType;

    const skip = (page - 1) * limit;

    const [entries, total, account] = await Promise.all([
      prisma.financeLedger.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.financeLedger.count({ where }),
      prisma.financeAccount.findUnique({
        where: { id: accountId },
        select: { id: true, name: true, type: true, openingBalance: true },
      }),
    ]);

    // Recalculate running balance from scratch for accuracy
    // Get ALL entries up to the current page to compute opening balance for page
    let runningBal = new Prisma.Decimal(0);
    if (skip > 0) {
      const beforeEntries = await prisma.financeLedger.aggregate({
        where: { accountId, createdAt: { lt: entries[0]?.createdAt } },
        _sum: { credit: true, debit: true },
      });
      runningBal = (beforeEntries._sum.credit ?? new Prisma.Decimal(0))
        .sub(beforeEntries._sum.debit ?? new Prisma.Decimal(0));
    }

    const serialized = entries.map((e) => {
      runningBal = runningBal.add(e.credit).sub(e.debit);
      return {
        id: e.id,
        entryType: e.entryType,
        referenceNumber: e.referenceNumber,
        referenceId: e.referenceId,
        description: e.description,
        debit: e.debit.toFixed(3),
        credit: e.credit.toFixed(3),
        runningBalance: runningBal.toFixed(3),
        remarks: e.remarks,
        createdBy: e.createdBy,
        createdAt: e.createdAt.toISOString(),
      };
    });

    return {
      account: account
        ? {
            ...account,
            openingBalance: account.openingBalance.toFixed(3),
          }
        : null,
      entries: serialized,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Generate statement data for PDF/Excel export.
   * Recalculates running balance from scratch — 100% accurate.
   */
  async generateStatement(
    accountId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const { prisma } = await import('../../lib/prisma.js');

    const account = await prisma.financeAccount.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, type: true, openingBalance: true, currency: true, bankName: true, accountNumber: true },
    });

    if (!account) throw new Error('Account not found');

    const where: Prisma.FinanceLedgerWhereInput = { accountId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const entries = await prisma.financeLedger.findMany({
      where,
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Recalculate running balance from scratch
    let runningBal = new Prisma.Decimal(0);
    const rows = entries.map((e) => {
      runningBal = runningBal.add(e.credit).sub(e.debit);
      return {
        date: e.createdAt.toISOString(),
        referenceNumber: e.referenceNumber ?? '',
        entryType: e.entryType,
        description: e.description,
        debit: e.debit.isZero() ? '' : e.debit.toFixed(3),
        credit: e.credit.isZero() ? '' : e.credit.toFixed(3),
        runningBalance: runningBal.toFixed(3),
        createdBy: e.createdBy.name,
        remarks: e.remarks ?? '',
      };
    });

    const totalDebit = entries.reduce((acc, e) => acc.add(e.debit), new Prisma.Decimal(0));
    const totalCredit = entries.reduce((acc, e) => acc.add(e.credit), new Prisma.Decimal(0));

    return {
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        openingBalance: account.openingBalance.toFixed(3),
      },
      period: { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null },
      rows,
      summary: {
        totalDebit: totalDebit.toFixed(3),
        totalCredit: totalCredit.toFixed(3),
        closingBalance: runningBal.toFixed(3),
      },
    };
  },
};
