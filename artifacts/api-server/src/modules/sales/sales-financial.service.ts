import { Prisma, PaymentStatus, PaymentType, PaymentMethod } from '@prisma/client';
import { ValidationError } from '../../errors/AppError.js';
import { prisma } from '../../lib/prisma.js';
import { FinanceProfitService } from '../finance/finance-profit.service.js';

export const SalesFinancialService = {
  /**
   * Initializes financial fields for a new DELIVERED sale.
   * If it's a credit sale, it increases the customer's Accounts Receivable balance.
   * If it's a cash sale, it immediately creates a payment and marks it PAID.
   */
  async postSale(
    tx: Prisma.TransactionClient,
    saleId: string,
    netAmount: string | Prisma.Decimal,
    isCashSale: boolean = false,
    userId?: string
  ): Promise<void> {
    const amount = new Prisma.Decimal(netAmount);
    
    // 1. Fetch sale to get customerId and paymentMethod
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      select: { customerId: true, number: true, paymentMethod: true },
    });

    if (!sale) throw new ValidationError('Sale not found during financial posting');

    if (isCashSale) {
      if (!userId) throw new ValidationError('userId is required to post a cash sale payment');

      // Cash Sale: Customer pays immediately
      await tx.sale.update({
        where: { id: saleId },
        data: {
          paidAmount: amount,
          outstandingAmount: 0,
          paymentStatus: 'PAID',
        },
      });

      // Generate a Payment Receipt
      const year = new Date().getFullYear();
      const lastPayment = await tx.payment.findFirst({
        where: { number: { startsWith: `PAY-${year}-` } },
        orderBy: { number: 'desc' },
      });
      const nextSeq = lastPayment ? parseInt(lastPayment.number.split('-')[2]!, 10) + 1 : 1;
      const paymentNumber = `PAY-${year}-${nextSeq.toString().padStart(4, '0')}`;

      await tx.payment.create({
        data: {
          number: paymentNumber,
          type: 'CUSTOMER',
          method: sale.paymentMethod ?? 'CASH',
          mode: 'IMMEDIATE',
          status: 'COMPLETED',
          customerId: sale.customerId,
          userId: userId,
          amount: amount,
          allocatedAmount: amount,
          remainingAmount: 0,
          referenceNumber: `Cash payment for ${sale.number}`,
          allocations: {
            create: {
              saleId: saleId,
              amount: amount,
              allocatedById: userId,
            }
          }
        }
      });
      
      // Distribute profit immediately on cash sale since it's fully paid
      await FinanceProfitService.distributeSaleProfit(tx, saleId, userId);
      
      // Note: Cash sale doesn't increase AR balance because it's paid instantly.
    } else {
      // Credit Sale: Increase Accounts Receivable balance
      await tx.sale.update({
        where: { id: saleId },
        data: {
          paidAmount: 0,
          outstandingAmount: amount,
          paymentStatus: 'UNPAID',
        },
      });

      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });
    }
  },

  /**
   * Reverses the financial impact of a cancelled DELIVERED sale.
   */
  async reverseSale(
    tx: Prisma.TransactionClient,
    saleId: string
  ): Promise<void> {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      select: { outstandingAmount: true, customerId: true, paymentStatus: true, paidAmount: true },
    });

    if (!sale) throw new ValidationError('Sale not found during reversal');

    // If there is an outstanding amount, we must reverse it from the customer's AR balance
    if (sale.outstandingAmount.gt(0)) {
      await tx.customer.update({
        where: { id: sale.customerId },
        data: {
          balance: {
            decrement: sale.outstandingAmount,
          },
        },
      });
    }

    // Reset financial fields
    await tx.sale.update({
      where: { id: saleId },
      data: {
        paidAmount: 0,
        outstandingAmount: 0,
        paymentStatus: 'UNPAID',
      },
    });

    if (sale.paymentStatus === 'PAID') {
      await FinanceProfitService.revertSaleProfit(tx, saleId);
    }
  },

  /**
   * Register a payment allocation against a specific sale.
   */
  async registerPayment(
    tx: Prisma.TransactionClient,
    saleId: string,
    paymentAmount: string | Prisma.Decimal
  ): Promise<void> {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      select: { customerId: true, paidAmount: true, outstandingAmount: true, netAmount: true, paymentStatus: true },
    });

    if (!sale) throw new ValidationError('Sale not found');

    const amount = new Prisma.Decimal(paymentAmount);
    
    if (amount.gt(sale.outstandingAmount)) {
      throw new ValidationError('Payment amount cannot exceed outstanding amount');
    }

    const newPaidAmount = sale.paidAmount.add(amount);
    const newOutstanding = sale.outstandingAmount.minus(amount);
    
    let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
    if (newOutstanding.lte(0)) {
      newPaymentStatus = 'PAID';
    }

    // Update the sale
    await tx.sale.update({
      where: { id: saleId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        paymentStatus: newPaymentStatus
      }
    });

    // If just became fully paid, distribute profit
    if (sale.paymentStatus !== 'PAID' && newPaymentStatus === 'PAID') {
      // We don't have userId directly here in registerPayment. We can just use a system ID or fetch from somewhere, but registerPayment is usually called from payment creation. 
      // Wait, registerPayment doesn't take userId. I'll just use the customer's ID or pass 'system' since it's automated.
      // Actually, passing 'system' is fine for createdById since it's an automated ledger entry.
      await FinanceProfitService.distributeSaleProfit(tx, saleId, 'system');
    }

    // Decrease the customer's AR balance since they paid
    await tx.customer.update({
      where: { id: sale.customerId },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });
  },

  /**
   * Reverse a payment allocation against a specific sale.
   */
  async reversePayment(
    tx: Prisma.TransactionClient,
    saleId: string,
    paymentAmount: string | Prisma.Decimal
  ): Promise<void> {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      select: { customerId: true, paidAmount: true, outstandingAmount: true, netAmount: true, paymentStatus: true },
    });

    if (!sale) throw new ValidationError('Sale not found');

    const amount = new Prisma.Decimal(paymentAmount);
    
    if (amount.gt(sale.paidAmount)) {
      throw new ValidationError('Reversal amount cannot exceed paid amount');
    }

    const newPaidAmount = sale.paidAmount.minus(amount);
    const newOutstanding = sale.outstandingAmount.add(amount);
    
    let newPaymentStatus: PaymentStatus = 'PARTIALLY_PAID';
    if (newPaidAmount.lte(0)) {
      newPaymentStatus = 'UNPAID';
    }

    // Update the sale
    await tx.sale.update({
      where: { id: saleId },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstanding,
        paymentStatus: newPaymentStatus
      }
    });

    // If it was fully paid and now it's not, revert profit
    if (sale.paymentStatus === 'PAID') {
      await FinanceProfitService.revertSaleProfit(tx, saleId);
    }

    // Increase the customer's AR balance back since the payment was cancelled
    await tx.customer.update({
      where: { id: sale.customerId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }
};
