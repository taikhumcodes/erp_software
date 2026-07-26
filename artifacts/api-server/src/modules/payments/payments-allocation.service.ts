import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';

export const PaymentsAllocationService = {
  async allocate(paymentId: string, data: Record<string, any>) {
    const { saleId, purchaseId, amount, userId } = data;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      throw new AppError('Allocation amount must be greater than zero', 400);
    }

    if (!saleId && !purchaseId) {
      throw new AppError('Either saleId or purchaseId is required', 400);
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { id: true, status: true, type: true, remainingAmount: true, customerId: true, supplierId: true },
      });

      if (!payment) {
        throw new AppError('Payment not found', 404);
      }
      if (payment.status !== 'PENDING') {
        throw new AppError('Can only allocate to PENDING payments', 400);
      }

      const allocAmount = new Prisma.Decimal(amount);
      if (allocAmount.gt(payment.remainingAmount)) {
        throw new AppError('Allocation amount exceeds remaining payment amount', 400);
      }

      if (payment.type === 'CUSTOMER') {
        if (!saleId) throw new AppError('saleId required for CUSTOMER payments', 400);
        const sale = await tx.sale.findUnique({ where: { id: saleId } });
        if (!sale) throw new AppError('Sale not found', 404);
        if (sale.customerId !== payment.customerId) {
          throw new AppError('Sale customer does not match payment customer', 400);
        }
        if (allocAmount.gt(sale.outstandingAmount)) {
          throw new AppError('Allocation amount exceeds sale outstanding amount', 400);
        }
      } else if (payment.type === 'SUPPLIER') {
        if (!purchaseId) throw new AppError('purchaseId required for SUPPLIER payments', 400);
        const purchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
        if (!purchase) throw new AppError('Purchase not found', 404);
        if (purchase.supplierId !== payment.supplierId) {
          throw new AppError('Purchase supplier does not match payment supplier', 400);
        }
        if (allocAmount.gt(purchase.outstandingAmount)) {
          throw new AppError('Allocation amount exceeds purchase outstanding amount', 400);
        }
      }

      const allocation = await tx.paymentAllocation.create({
        data: {
          paymentId,
          saleId: payment.type === 'CUSTOMER' ? saleId : null,
          purchaseId: payment.type === 'SUPPLIER' ? purchaseId : null,
          amount: allocAmount,
          allocatedById: userId,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          allocatedAmount: { increment: allocAmount },
          remainingAmount: { decrement: allocAmount },
        },
      });

      return allocation;
    });
  },

  async removeAllocation(paymentId: string, allocationId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: { status: true },
      });

      if (!payment) throw new AppError('Payment not found', 404);
      if (payment.status !== 'PENDING') {
        throw new AppError('Cannot remove allocations from non-PENDING payments', 400);
      }

      const allocation = await tx.paymentAllocation.findUnique({
        where: { id: allocationId },
      });

      if (!allocation || allocation.paymentId !== paymentId) {
        throw new AppError('Allocation not found on this payment', 404);
      }

      await tx.paymentAllocation.delete({ where: { id: allocationId } });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          allocatedAmount: { decrement: allocation.amount },
          remainingAmount: { increment: allocation.amount },
        },
      });
    });
  }
};
