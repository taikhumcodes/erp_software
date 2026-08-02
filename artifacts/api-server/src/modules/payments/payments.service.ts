import { Prisma, TransactionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { PaymentsRepository, type PaymentFilters } from './payments.repository.js';
import { SalesFinancialService } from '../sales/sales-financial.service.js';
import { PurchaseFinancialService } from '../purchases/purchase-financial.service.js';
import { AppError } from '../../errors/AppError.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';
import { FinanceLedgerService } from '../finance/finance-ledger.service.js';
import { FinanceAuditService } from '../finance/finance-audit.service.js';

export const PaymentsService = {
  async list(filters: PaymentFilters) {
    return PaymentsRepository.findAll(filters);
  },

  async getById(id: string) {
    const payment = await PaymentsRepository.findById(id);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    return payment;
  },

  async getStatistics() {
    return PaymentsRepository.getStatistics();
  },

  async create(userId: string, data: Record<string, any>) {
    const { type, method, mode, customerId, supplierId, amount, paymentDate, referenceNumber, notes, accountId } = data;

    if (!type || !['CUSTOMER', 'SUPPLIER'].includes(type)) {
      throw new AppError('Invalid payment type', 400);
    }

    if (type === 'CUSTOMER' && !customerId) {
      throw new AppError('customerId is required for CUSTOMER payments', 400);
    }
    if (type === 'SUPPLIER' && !supplierId) {
      throw new AppError('supplierId is required for SUPPLIER payments', 400);
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new AppError('Amount must be greater than zero', 400);
    }

    // Validate accountId if provided
    if (accountId) {
      const account = await prisma.financeAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new AppError('Financial account not found', 404);
      if (account.status !== 'ACTIVE') throw new AppError('Selected financial account is not active', 400);
      if (account.type === 'PARTNER_CAPITAL') throw new AppError('Cannot link standard payments to a Partner Capital account', 400);
    }

    const number = await DocumentNumberService.generateNextNumber({
      model: 'payment',
      prefix: 'PAY',
      sequenceLength: 6,
    });

    return prisma.$transaction(async (tx) => {
      // Create payment as PENDING
      return PaymentsRepository.create(tx, {
        number,
        type,
        method: method || 'CASH',
        mode: mode || 'IMMEDIATE',
        status: 'PENDING',
        customerId: type === 'CUSTOMER' ? customerId : null,
        supplierId: type === 'SUPPLIER' ? supplierId : null,
        amount,
        allocatedAmount: 0,
        remainingAmount: amount,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNumber,
        notes,
        userId,
        accountId: accountId || null,
      });
    });
  },

  async updateStatus(id: string, data: { status: TransactionStatus; userId: string }) {
    const { status, userId } = data;

    if (!['COMPLETED', 'CANCELLED'].includes(status)) {
      throw new AppError('Invalid status transition', 400);
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { allocations: true },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.status === status) {
        return payment;
      }

      if (payment.status === 'CANCELLED') {
        throw new AppError('Cannot change status of a cancelled payment', 400);
      }

      if (status === 'COMPLETED') {
        if (payment.status !== 'PENDING') {
          throw new AppError('Only PENDING payments can be marked as COMPLETED', 400);
        }

        // Apply all allocations to invoices and balance
        for (const alloc of payment.allocations) {
          if (payment.type === 'CUSTOMER' && alloc.saleId) {
            await SalesFinancialService.registerPayment(tx, alloc.saleId, alloc.amount, userId);
          } else if (payment.type === 'SUPPLIER' && alloc.purchaseId) {
            await PurchaseFinancialService.registerPayment(tx, alloc.purchaseId, alloc.amount);
          }
        }

        // Handle advance/unallocated amount if remaining > 0
        if (payment.remainingAmount.gt(0)) {
          if (payment.type === 'CUSTOMER') {
            await tx.customer.update({
              where: { id: payment.customerId! },
              data: { balance: { decrement: payment.remainingAmount } },
            });
          } else if (payment.type === 'SUPPLIER') {
            await tx.supplier.update({
              where: { id: payment.supplierId! },
              data: { balance: { decrement: payment.remainingAmount } },
            });
          }
        }

        // ── Finance Ledger Integration ────────────────────────────────────────
        // If this payment is linked to a financial account, post the ledger entry
        if (payment.accountId) {
          const entryType = payment.type === 'CUSTOMER' ? 'SALE_PAYMENT' : 'PURCHASE_PAYMENT';
          const isIncoming = payment.type === 'CUSTOMER';
          await FinanceLedgerService.postEntry(tx, {
            accountId: payment.accountId,
            entryType,
            credit: isIncoming ? Number(payment.amount) : 0,
            debit:  isIncoming ? 0 : Number(payment.amount),
            description: `Payment ${payment.number}`,
            referenceNumber: payment.number,
            referenceId: payment.id,
            createdById: userId,
          });
          await FinanceAuditService.log(tx, {
            action: 'PAYMENT_LINKED',
            module: 'PAYMENT',
            referenceId: payment.id,
            reference: payment.number,
            amount: Number(payment.amount),
            accountId: payment.accountId,
            userId,
            newValue: { type: payment.type, amount: payment.amount.toFixed(3) },
          });
        }
        // ─────────────────────────────────────────────────────────────────────

        return PaymentsRepository.updateStatus(tx, id, { status: 'COMPLETED' });
      }

      if (status === 'CANCELLED') {
        if (payment.status !== 'COMPLETED') {
          throw new AppError('Only COMPLETED payments can be cancelled', 400);
        }

        // Reverse all allocations
        for (const alloc of payment.allocations) {
          if (payment.type === 'CUSTOMER' && alloc.saleId) {
            await SalesFinancialService.reversePayment(tx, alloc.saleId, alloc.amount);
          } else if (payment.type === 'SUPPLIER' && alloc.purchaseId) {
            await PurchaseFinancialService.reversePayment(tx, alloc.purchaseId, alloc.amount);
          }
        }

        // Reverse advance/unallocated amount if remaining > 0
        if (payment.remainingAmount.gt(0)) {
          if (payment.type === 'CUSTOMER') {
            await tx.customer.update({
              where: { id: payment.customerId! },
              data: { balance: { increment: payment.remainingAmount } },
            });
          } else if (payment.type === 'SUPPLIER') {
            await tx.supplier.update({
              where: { id: payment.supplierId! },
              data: { balance: { increment: payment.remainingAmount } },
            });
          }
        }

        // ── Finance Ledger Reversal ───────────────────────────────────────────
        // Reverse the ledger entry if the payment was linked to a financial account
        if (payment.accountId) {
          const isIncoming = payment.type === 'CUSTOMER';
          await FinanceLedgerService.postEntry(tx, {
            accountId: payment.accountId,
            entryType: 'ADJUSTMENT',
            debit:  isIncoming ? Number(payment.amount) : 0,
            credit: isIncoming ? 0 : Number(payment.amount),
            description: `Reversal of Payment ${payment.number}`,
            referenceNumber: payment.number,
            referenceId: payment.id,
            createdById: userId,
          });
        }
        // ─────────────────────────────────────────────────────────────────────

        return PaymentsRepository.updateStatus(tx, id, {
          status: 'CANCELLED',
          cancelledById: userId,
          cancelledAt: new Date(),
        });
      }

      throw new AppError('Unreachable status transition code path', 500);
    });
  },

  async delete(id: string) {
    const payment = await PaymentsRepository.findById(id);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    if (payment.status !== 'PENDING' && payment.status !== 'CANCELLED') {
      throw new AppError('Only PENDING or CANCELLED payments can be deleted', 400);
    }

    await PaymentsRepository.delete(id);
  }
};
