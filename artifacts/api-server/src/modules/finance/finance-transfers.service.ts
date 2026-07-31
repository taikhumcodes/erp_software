import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { FinanceLedgerService } from './finance-ledger.service.js';
import { FinanceAuditService } from './finance-audit.service.js';
import { FinanceAccountsRepository } from './finance-accounts.repository.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';

export const FinanceTransfersService = {
  async list(filters: { page?: number; limit?: number; accountId?: string } = {}) {
    const { page = 1, limit = 20, accountId } = filters;
    const where: Prisma.MoneyTransferWhereInput = {};
    if (accountId) {
      where.OR = [{ fromAccountId: accountId }, { toAccountId: accountId }];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.moneyTransfer.findMany({
        where,
        include: {
          fromAccount: { select: { id: true, name: true, type: true } },
          toAccount: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.moneyTransfer.count({ where }),
    ]);

    return {
      items: items.map((t) => ({
        ...t,
        amount: t.amount.toFixed(3),
        createdAt: t.createdAt.toISOString(),
        transferDate: t.transferDate.toISOString(),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },

  async create(userId: string, data: Record<string, any>) {
    const { fromAccountId, toAccountId, amount, transferDate, description, referenceNumber } = data;

    if (!fromAccountId || !toAccountId) throw new AppError('Both accounts are required', 400);
    if (fromAccountId === toAccountId) throw new AppError('Source and destination accounts must be different', 400);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new AppError('Amount must be greater than zero', 400);

    const [fromAcc, toAcc] = await Promise.all([
      prisma.financeAccount.findUnique({ where: { id: fromAccountId } }),
      prisma.financeAccount.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!fromAcc) throw new AppError('Source account not found', 404);
    if (!toAcc) throw new AppError('Destination account not found', 404);
    if (fromAcc.status !== 'ACTIVE') throw new AppError('Source account is not active', 400);
    if (toAcc.status !== 'ACTIVE') throw new AppError('Destination account is not active', 400);

    const fromBalance = await FinanceAccountsRepository.calculateBalance(fromAccountId);
    if (Number(fromBalance) < Number(amount)) {
      throw new AppError('Source account does not have sufficient balance', 400);
    }

    const number = await DocumentNumberService.generateNextNumber({ model: 'moneyTransfer' as any, prefix: 'TRF', sequenceLength: 6 });
    const amt = Number(amount);
    const desc = description?.trim() || `Transfer from ${fromAcc.name} to ${toAcc.name}`;

    return prisma.$transaction(async (tx) => {
      const transfer = await tx.moneyTransfer.create({
        data: {
          number,
          fromAccountId,
          toAccountId,
          amount: amt,
          transferDate: transferDate ? new Date(transferDate) : new Date(),
          description: desc,
          referenceNumber: referenceNumber?.trim() || null,
          createdById: userId,
        },
        include: {
          fromAccount: { select: { id: true, name: true, type: true } },
          toAccount: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      // Debit from source
      await FinanceLedgerService.postEntry(tx, {
        accountId: fromAccountId,
        entryType: 'TRANSFER_OUT',
        debit: amt,
        description: `Transfer to ${toAcc.name} — ${desc}`,
        referenceNumber: number,
        referenceId: transfer.id,
        createdById: userId,
      });

      // Credit to destination
      await FinanceLedgerService.postEntry(tx, {
        accountId: toAccountId,
        entryType: 'TRANSFER_IN',
        credit: amt,
        description: `Transfer from ${fromAcc.name} — ${desc}`,
        referenceNumber: number,
        referenceId: transfer.id,
        createdById: userId,
      });

      await FinanceAuditService.log(tx, {
        action: 'TRANSFER_CREATED',
        module: 'TRANSFER',
        referenceId: transfer.id,
        reference: number,
        amount: amt,
        accountId: fromAccountId,
        userId,
        newValue: { from: fromAcc.name, to: toAcc.name, amount: amt },
      });

      return {
        ...transfer,
        amount: transfer.amount.toFixed(3),
        createdAt: transfer.createdAt.toISOString(),
        transferDate: transfer.transferDate.toISOString(),
      };
    });
  },

  async delete(userId: string, id: string) {
    const existing = await prisma.moneyTransfer.findUnique({ where: { id } });
    if (!existing) throw new AppError('Transfer not found', 404);

    await prisma.$transaction(async (tx) => {
      // Clean up associated ledger entries
      await tx.financeLedger.deleteMany({ where: { referenceId: id } });
      
      await tx.moneyTransfer.delete({ where: { id } });
      
      await FinanceAuditService.log(tx, {
        action: 'TRANSFER_CREATED', // Using existing audit action type since there isn't a TRANSFER_DELETED
        module: 'TRANSFER',
        referenceId: id,
        reference: existing.number,
        amount: Number(existing.amount),
        accountId: existing.fromAccountId, // Using fromAccount for audit
        userId,
        remarks: 'Money transfer deleted',
        oldValue: { number: existing.number, amount: existing.amount.toFixed(3) },
      });
    });
  },
};
