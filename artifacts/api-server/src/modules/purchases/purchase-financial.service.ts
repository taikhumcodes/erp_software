import { Prisma, PurchaseStatus, PaymentStatus } from '@prisma/client';
import { ValidationError } from '../../errors/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { PurchasesRepository } from './purchases.repository.js';

export const PurchaseFinancialService = {
  /**
   * Initializes financial fields for a new purchase.
   * If the purchase is immediately RECEIVED, it also increases the supplier's balance.
   */
  async postPurchase(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    netAmount: string | Prisma.Decimal
  ): Promise<void> {
    const amount = new Prisma.Decimal(netAmount);
    
    // 1. Initialize financial fields
    const updatedPurchase = await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: 0,
        outstandingAmount: amount,
        paymentStatus: 'UNPAID',
      },
    });

    // 2. Increase supplier balance
    await tx.supplier.update({
      where: { id: updatedPurchase.supplierId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  },

  /**
   * Reverses the financial impact of a cancelled or un-received purchase.
   */
  async reversePurchase(
    tx: Prisma.TransactionClient,
    purchaseId: string
  ): Promise<void> {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      select: { outstandingAmount: true, supplierId: true },
    });

    if (!purchase) throw new ValidationError('Purchase not found during reversal');

    // 1. Decrease supplier balance by outstanding amount
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balance: {
          decrement: purchase.outstandingAmount,
        },
      },
    });

    // 2. Reset financial fields (or keep them as 0 if cancelled)
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: 0,
        outstandingAmount: 0,
        paymentStatus: 'UNPAID',
      },
    });
  },

  /**
   * Recalculates financials when an existing RECEIVED purchase is edited.
   */
  async recalculatePurchase(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    oldNetAmount: string | Prisma.Decimal,
    newNetAmount: string | Prisma.Decimal
  ): Promise<void> {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      select: { supplierId: true, paidAmount: true },
    });

    if (!purchase) throw new ValidationError('Purchase not found during recalculation');

    const oldTotal = new Prisma.Decimal(oldNetAmount);
    const newTotal = new Prisma.Decimal(newNetAmount);
    const difference = newTotal.minus(oldTotal);

    // 1. Update supplier balance by the difference
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balance: {
          increment: difference,
        },
      },
    });

    // 2. Recalculate outstanding amount and payment status
    const newOutstanding = newTotal.minus(purchase.paidAmount);
    let newPaymentStatus: PaymentStatus = 'UNPAID';

    if (newOutstanding.lte(0) && newTotal.gt(0)) {
      newPaymentStatus = 'PAID';
    } else if (purchase.paidAmount.gt(0) && newOutstanding.gt(0)) {
      newPaymentStatus = 'PARTIALLY_PAID';
    }

    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        outstandingAmount: newOutstanding,
        paymentStatus: newPaymentStatus,
      },
    });
  },

  /**
   * Register a payment allocation against a specific purchase.
   */
  async registerPayment(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    paymentAmount: string | Prisma.Decimal
  ): Promise<void> {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      select: { supplierId: true, paidAmount: true, outstandingAmount: true, netAmount: true },
    });

    if (!purchase) throw new ValidationError('Purchase not found');

    const amount = new Prisma.Decimal(paymentAmount);
    
    if (amount.gt(purchase.outstandingAmount)) {
      throw new ValidationError('Payment amount cannot exceed outstanding amount');
    }

    const newPaidAmount = purchase.paidAmount.add(amount);
    const newOutstanding = purchase.outstandingAmount.minus(amount);
    
    let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
    if (newOutstanding.lte(0)) {
      newPaymentStatus = 'PAID';
    }

    // Update the purchase
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        paymentStatus: newPaymentStatus
      }
    });

    // Decrease the supplier's balance since we paid them
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });
  },

  /**
   * Reverse a payment allocation against a specific purchase.
   */
  async reversePayment(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    paymentAmount: string | Prisma.Decimal
  ): Promise<void> {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      select: { supplierId: true, paidAmount: true, outstandingAmount: true, netAmount: true },
    });

    if (!purchase) throw new ValidationError('Purchase not found');

    const amount = new Prisma.Decimal(paymentAmount);
    
    if (amount.gt(purchase.paidAmount)) {
      throw new ValidationError('Reversal amount cannot exceed paid amount');
    }

    const newPaidAmount = purchase.paidAmount.minus(amount);
    const newOutstanding = purchase.outstandingAmount.add(amount);
    
    let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
    if (newPaidAmount.lte(0)) {
      newPaymentStatus = 'UNPAID';
    }

    // Update the purchase
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        paymentStatus: newPaymentStatus
      }
    });

    // Increase the supplier's balance back since the payment was cancelled
    await tx.supplier.update({
      where: { id: purchase.supplierId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }
};
