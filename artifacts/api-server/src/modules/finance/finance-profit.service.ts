import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { FinanceLedgerService } from './finance-ledger.service.js';

export const FinanceProfitService = {
  /**
   * Distributes profit equally among all active PARTNER_CAPITAL accounts.
   * Called when a sale is fully paid.
   */
  async distributeSaleProfit(tx: Prisma.TransactionClient, saleId: string, userId: string) {
    // 1. Calculate Profit
    // We need the sale with its items, and the products to get their cost prices
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: { include: { product: true } } }
    });
    
    if (!sale) return;

    let totalCost = new Prisma.Decimal(0);
    for (const item of sale.items) {
      const itemCost = item.quantity.mul(item.product.costPrice);
      totalCost = totalCost.add(itemCost);
    }

    const profit = sale.netAmount.sub(totalCost);

    if (profit.lte(0)) {
      return; // No profit or negative profit, no distribution
    }

    // 2. Fetch all active Partner Capital accounts
    const partnerAccounts = await tx.financeAccount.findMany({
      where: { type: 'PARTNER_CAPITAL', status: 'ACTIVE' }
    });

    if (partnerAccounts.length === 0) {
      return; // No partner accounts to distribute to
    }

    // 3. Divide equally and round to 3 decimal places to match DB precision
    const splitAmount = profit.div(partnerAccounts.length).toDecimalPlaces(3);

    // 4. Create PROFIT_SHARE ledger entries
    for (const account of partnerAccounts) {
      // In typical ERP, asset/cash debit increases it. But for Equity/Capital, Credit increases it.
      // Wait! In this system, is debit always positive balance?
      // Let's use `debit: splitAmount` first, but we must check if other income accounts use credit or debit.
      // Usually "MISC_INCOME" uses `credit`. "OWNER_INVESTMENT" uses `credit`. "DEPOSIT" uses `credit`.
      // Let's use `credit: splitAmount` for capital increment. Wait, let me check `FinanceLedgerService.postEntry` logic.
      await FinanceLedgerService.postEntry(tx, {
        accountId: account.id,
        entryType: 'PROFIT_SHARE',
        credit: splitAmount, // Capital increases with Credit (Balance = Credit - Debit)
        description: `Profit Share from Sale ${sale.number}`,
        referenceNumber: sale.number,
        referenceId: sale.id,
        createdById: userId,
      });
    }
  },

  /**
   * Reverts previously distributed profit for a sale.
   */
  async revertSaleProfit(tx: Prisma.TransactionClient, saleId: string) {
    await tx.financeLedger.deleteMany({
      where: {
        referenceId: saleId,
        entryType: 'PROFIT_SHARE'
      }
    });
  },

  /**
   * Distributes an expense cost equally among all active PARTNER_CAPITAL accounts
   * by posting a PROFIT_SHARE debit to each. This ensures each partner bears their
   * proportional share of operational expenses, reducing their capital balance.
   */
  async distributeExpenseCost(
    tx: Prisma.TransactionClient,
    expenseId: string,
    expenseName: string,
    expenseNumber: string,
    amount: Prisma.Decimal | number,
    userId: string
  ) {
    const partnerAccounts = await tx.financeAccount.findMany({
      where: { type: 'PARTNER_CAPITAL', status: 'ACTIVE' }
    });

    if (partnerAccounts.length === 0) return; // No partner accounts — skip

    const totalAmount = new Prisma.Decimal(amount.toString());
    const splitAmount = totalAmount.div(partnerAccounts.length).toDecimalPlaces(3);

    for (const account of partnerAccounts) {
      await FinanceLedgerService.postEntry(tx, {
        accountId: account.id,
        entryType: 'PROFIT_SHARE',
        debit: splitAmount,   // Debit reduces partner capital (expense burden)
        description: `Expense Share: ${expenseName}`,
        referenceNumber: expenseNumber,
        referenceId: expenseId,
        createdById: userId,
      });
    }
  },

  /**
   * Reverts a previously distributed expense cost for a given expense.
   */
  async revertExpenseCost(tx: Prisma.TransactionClient, expenseId: string) {
    await tx.financeLedger.deleteMany({
      where: { referenceId: expenseId, entryType: 'PROFIT_SHARE' }
    });
  }
};
