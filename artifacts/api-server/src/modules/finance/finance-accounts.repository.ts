import { Prisma, AccountStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';

// ─── Selects ──────────────────────────────────────────────────────────────────

const accountSelect = {
  id: true,
  name: true,
  type: true,
  status: true,
  bankName: true,
  accountNumber: true,
  branch: true,
  currency: true,
  openingBalance: true,
  description: true,
  isDefault: true,
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FinanceAccountSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const FinanceAccountsRepository = {
  async findAll(filters: { status?: AccountStatus; type?: string } = {}) {
    const where: Prisma.FinanceAccountWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type as any;

    const accounts = await prisma.financeAccount.findMany({
      where,
      select: accountSelect,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    // Attach calculated balance to each account
    return Promise.all(accounts.map(async (acc) => {
      const balance = await this.calculateBalance(acc.id);
      return serialize(acc, balance);
    }));
  },

  async findById(id: string) {
    const acc = await prisma.financeAccount.findUnique({
      where: { id },
      select: accountSelect,
    });
    if (!acc) return null;
    const balance = await this.calculateBalance(id);
    return serialize(acc, balance);
  },

  async create(tx: Prisma.TransactionClient, data: Prisma.FinanceAccountUncheckedCreateInput) {
    const acc = await tx.financeAccount.create({ data, select: accountSelect });
    return acc;
  },

  async update(tx: Prisma.TransactionClient, id: string, data: Prisma.FinanceAccountUncheckedUpdateInput) {
    const acc = await tx.financeAccount.update({ where: { id }, data, select: accountSelect });
    return acc;
  },

  async hasTransactions(id: string): Promise<boolean> {
    const count = await prisma.financeLedger.count({ where: { accountId: id } });
    return count > 0;
  },

  async delete(id: string) {
    await prisma.financeAccount.delete({ where: { id } });
  },

  async unsetAllDefaults(tx: Prisma.TransactionClient) {
    await tx.financeAccount.updateMany({ data: { isDefault: false } });
  },

  /**
   * Calculate balance from ledger entries — no stored value is trusted.
   * Balance = SUM(credit) - SUM(debit) across all entries
   */
  async calculateBalance(accountId: string, tx?: Prisma.TransactionClient): Promise<Prisma.Decimal> {
    const client = tx ?? prisma;
    const agg = await client.financeLedger.aggregate({
      where: { accountId },
      _sum: { credit: true, debit: true },
    });
    const totalCredit = agg._sum.credit ?? new Prisma.Decimal(0);
    const totalDebit = agg._sum.debit ?? new Prisma.Decimal(0);
    return totalCredit.sub(totalDebit);
  },
};

// ─── Serializer ───────────────────────────────────────────────────────────────

type AccountRow = Prisma.FinanceAccountGetPayload<{ select: typeof accountSelect }>;

function serialize(acc: AccountRow, calculatedBalance: Prisma.Decimal) {
  return {
    id: acc.id,
    name: acc.name,
    type: acc.type,
    status: acc.status,
    bankName: acc.bankName,
    accountNumber: acc.accountNumber,
    branch: acc.branch,
    currency: acc.currency,
    openingBalance: acc.openingBalance.toFixed(3),
    calculatedBalance: calculatedBalance.toFixed(3),
    description: acc.description,
    isDefault: acc.isDefault,
    createdBy: acc.createdBy,
    createdAt: acc.createdAt.toISOString(),
    updatedAt: acc.updatedAt.toISOString(),
  };
}
