import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { FinanceAccountsRepository } from './finance-accounts.repository.js';
import { FinanceLedgerService } from './finance-ledger.service.js';
import { FinanceAuditService } from './finance-audit.service.js';
import { FinanceTransfersService } from './finance-transfers.service.js';
import bcrypt from 'bcryptjs';

// ─── Account Adjustment types (manual transactions) ───────────────────────────

const CREDIT_ADJUSTMENTS = new Set([
  'OPENING_BALANCE', 'OWNER_INVESTMENT', 'DEPOSIT', 'BANK_INTEREST', 'MISC_INCOME',
]);

// ─── Service ──────────────────────────────────────────────────────────────────

export const FinanceAccountsService = {

  async list(filters: { status?: string; type?: string } = {}) {
    return FinanceAccountsRepository.findAll(filters as any);
  },

  async getById(id: string) {
    const account = await FinanceAccountsRepository.findById(id);
    if (!account) throw new AppError('Finance account not found', 404);
    return account;
  },

  async create(userId: string, data: Record<string, any>) {
    const { name, type, bankName, accountNumber, branch, currency, openingBalance, description, isDefault } = data;

    if (!name?.trim()) throw new AppError('Account name is required', 400);
    if (!type) throw new AppError('Account type is required', 400);

    const ob = Number(openingBalance ?? 0);
    if (isNaN(ob) || ob < 0) throw new AppError('Opening balance must be a non-negative number', 400);

    return prisma.$transaction(async (tx) => {
      // If setting as default, unset all others first
      if (isDefault) await FinanceAccountsRepository.unsetAllDefaults(tx);

      const account = await FinanceAccountsRepository.create(tx, {
        name: name.trim(),
        type,
        bankName: bankName?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        branch: branch?.trim() || null,
        currency: currency || 'KWD',
        openingBalance: ob,
        description: description?.trim() || null,
        isDefault: Boolean(isDefault),
        createdById: userId,
      });

      // If opening balance > 0, create the first ledger entry
      if (ob > 0) {
        await FinanceLedgerService.postEntry(tx, {
          accountId: account.id,
          entryType: 'OPENING_BALANCE',
          credit: ob,
          description: 'Opening Balance',
          createdById: userId,
        });
      }

      // Audit log
      await FinanceAuditService.log(tx, {
        action: 'ACCOUNT_CREATED',
        module: 'ACCOUNT',
        referenceId: account.id,
        reference: account.name,
        amount: ob > 0 ? ob : undefined,
        accountId: account.id,
        userId,
        newValue: { name: account.name, type: account.type, openingBalance: ob },
      });

      // Attach calculated balance
      const balance = await FinanceAccountsRepository.calculateBalance(account.id, tx);
      return { ...account, calculatedBalance: balance.toFixed(3) };
    });
  },

  async update(userId: string, id: string, data: Record<string, any>) {
    const existing = await FinanceAccountsRepository.findById(id);
    if (!existing) throw new AppError('Finance account not found', 404);

    if (existing.status === 'ARCHIVED') {
      throw new AppError('Archived accounts cannot be modified', 400);
    }

    // Block any attempt to change the balance directly
    if ('calculatedBalance' in data || 'currentBalance' in data) {
      throw new AppError('Balance cannot be manually set. Use Account Adjustments.', 400);
    }

    // Block changing opening balance after transactions exist
    const hasTx = await FinanceAccountsRepository.hasTransactions(id);
    if (hasTx && 'openingBalance' in data && String(data.openingBalance) !== existing.openingBalance) {
      throw new AppError('Opening balance cannot be changed after transactions exist', 400);
    }

    const { name, bankName, accountNumber, branch, currency, description, isDefault } = data;

    return prisma.$transaction(async (tx) => {
      if (isDefault) await FinanceAccountsRepository.unsetAllDefaults(tx);

      const updated = await FinanceAccountsRepository.update(tx, id, {
        ...(name !== undefined && { name: name.trim() }),
        ...(bankName !== undefined && { bankName: bankName?.trim() || null }),
        ...(accountNumber !== undefined && { accountNumber: accountNumber?.trim() || null }),
        ...(branch !== undefined && { branch: branch?.trim() || null }),
        ...(currency !== undefined && { currency }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
      });

      await FinanceAuditService.log(tx, {
        action: 'ACCOUNT_UPDATED',
        module: 'ACCOUNT',
        referenceId: id,
        reference: updated.name,
        accountId: id,
        userId,
        oldValue: { name: existing.name, bankName: existing.bankName },
        newValue: { name: updated.name, bankName: updated.bankName },
      });

      const balance = await FinanceAccountsRepository.calculateBalance(id, tx);
      return { ...updated, calculatedBalance: balance.toFixed(3) };
    });
  },

  async changeStatus(userId: string, id: string, newStatus: string, reason?: string) {
    const existing = await FinanceAccountsRepository.findById(id);
    if (!existing) throw new AppError('Finance account not found', 404);

    // Status transition rules
    if (existing.status === 'ARCHIVED') {
      throw new AppError('Archived accounts cannot be reactivated', 400);
    }
    if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(newStatus)) {
      throw new AppError('Invalid status', 400);
    }
    if (newStatus === existing.status) {
      throw new AppError('Account is already in that status', 400);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await FinanceAccountsRepository.update(tx, id, { status: newStatus as any });

      await FinanceAuditService.log(tx, {
        action: 'ACCOUNT_STATUS_CHANGED',
        module: 'ACCOUNT',
        referenceId: id,
        reference: existing.name,
        accountId: id,
        userId,
        oldValue: { status: existing.status },
        newValue: { status: newStatus },
        reason,
      });

      const balance = await FinanceAccountsRepository.calculateBalance(id, tx);
      return { ...updated, calculatedBalance: balance.toFixed(3) };
    });
  },

  async delete(userId: string, id: string) {
    const hasTx = await FinanceAccountsRepository.hasTransactions(id);
    if (hasTx) {
      throw new AppError(
        'This account has transaction history and cannot be deleted. Archive it instead.',
        409,
      );
    }
    await FinanceAccountsRepository.delete(id);
  },

  async secureArchive(userId: string, accountId: string, payload: { password: string, transferAccountId?: string }) {
    // 1. Verify owner password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(payload.password, user.passwordHash || ''))) {
      throw new AppError('Invalid password. Account deletion requires valid owner password.', 401);
    }

    // 2. Fetch the account and calculate balance
    const account = await FinanceAccountsRepository.findById(accountId);
    if (!account) throw new AppError('Finance account not found', 404);
    if (account.status === 'ARCHIVED') throw new AppError('Account is already archived', 400);

    const balance = await FinanceAccountsRepository.calculateBalance(accountId);

    // 3. Handle remaining balance
    if (balance.toNumber() > 0) {
      if (!payload.transferAccountId) {
        throw new AppError('Account has a positive balance. A transfer account is required to delete.', 400);
      }
      if (payload.transferAccountId === accountId) {
        throw new AppError('Cannot transfer to the same account', 400);
      }

      const transferAccount = await FinanceAccountsRepository.findById(payload.transferAccountId);
      if (!transferAccount || transferAccount.status !== 'ACTIVE') {
        throw new AppError('Invalid or inactive transfer account', 400);
      }

      // Transfer the balance
      await FinanceTransfersService.create(userId, {
        fromAccountId: accountId,
        toAccountId: payload.transferAccountId,
        amount: balance,
        referenceNumber: `ARCHIVE-TRF-${Date.now()}`,
        remarks: `Auto-transfer before archiving account ${account.name}`,
        date: new Date().toISOString()
      });
    }

    // 4. Archive the account
    const updated = await prisma.financeAccount.update({
      where: { id: accountId },
      data: { status: 'ARCHIVED' }
    });

    await FinanceAuditService.log(prisma, {
      action: 'ACCOUNT_STATUS_CHANGED',
      module: 'ACCOUNT',
      referenceId: accountId,
      reference: account.name,
      accountId: accountId,
      userId,
      oldValue: { status: account.status },
      newValue: { status: 'ARCHIVED', reason: 'Secure Archive' },
    });

    return updated;
  },

  /**
   * Account Adjustment — manual money movement on an account.
   * Types: OPENING_BALANCE, OWNER_INVESTMENT, OWNER_WITHDRAWAL, DEPOSIT,
   *        WITHDRAWAL, BANK_INTEREST, BANK_CHARGES, MISC_INCOME, MISC_EXPENSE, ADJUSTMENT
   */
  async createAdjustment(userId: string, accountId: string, data: Record<string, any>) {
    const account = await FinanceAccountsRepository.findById(accountId);
    if (!account) throw new AppError('Finance account not found', 404);
    if (account.status !== 'ACTIVE') {
      throw new AppError('Adjustments can only be made on active accounts', 400);
    }

    const { adjustmentType, amount, description, referenceNumber, remarks, date } = data;
    if (!adjustmentType) throw new AppError('Adjustment type is required', 400);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new AppError('Amount must be greater than zero', 400);
    }
    if (!description?.trim()) throw new AppError('Description is required', 400);

    const isCredit = CREDIT_ADJUSTMENTS.has(adjustmentType);

    return prisma.$transaction(async (tx) => {
      const entry = await FinanceLedgerService.postEntry(tx, {
        accountId,
        entryType: adjustmentType,
        credit: isCredit ? Number(amount) : 0,
        debit: isCredit ? 0 : Number(amount),
        description: description.trim(),
        referenceNumber,
        createdById: userId,
        remarks,
      });

      await FinanceAuditService.log(tx, {
        action: 'ADJUSTMENT_CREATED',
        module: 'ACCOUNT',
        referenceId: entry.id,
        amount: Number(amount),
        accountId,
        userId,
        newValue: { adjustmentType, amount, description },
        remarks,
      });

      const balance = await FinanceAccountsRepository.calculateBalance(accountId, tx);
      return {
        entry: {
          ...entry,
          debit: entry.debit.toFixed(3),
          credit: entry.credit.toFixed(3),
          runningBalance: entry.runningBalance.toFixed(3),
        },
        calculatedBalance: balance.toFixed(3),
      };
    });
  },
};
