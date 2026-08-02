import { PrismaClient } from '@prisma/client';
import { FinanceLedgerService } from './src/modules/finance/finance-ledger.service.js';

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.financeAccount.findFirst({ where: { name: 'MAIN ACCOUNT' } });
  
  if (!account) {
    console.error("Account 'MAIN ACCOUNT' not found!");
    return;
  }
  
  console.log(`Found account: ${account.name} (ID: ${account.id})`);

  const paymentNumbers = ['PAY-2026-000001', 'PAY-2026-000002', 'PAY-2026-000003', 'PAY-2026-000004', 'PAY-2026-000005'];
  
  const payments = await prisma.payment.findMany({
    where: { number: { in: paymentNumbers } }
  });

  await prisma.$transaction(async (tx) => {
    for (const payment of payments) {
      // Link payment to the new account
      await tx.payment.update({
        where: { id: payment.id },
        data: { accountId: account.id }
      });

      const entryType = payment.type === 'CUSTOMER' ? 'SALE_PAYMENT' : 'PURCHASE_PAYMENT';
      const isIncoming = payment.type === 'CUSTOMER';
      
      // Re-create the ledger entry for this payment in the new MAIN ACCOUNT
      await FinanceLedgerService.postEntry(tx, {
        accountId: account.id,
        entryType,
        credit: isIncoming ? Number(payment.amount) : 0,
        debit:  isIncoming ? 0 : Number(payment.amount),
        description: `Payment ${payment.number}`,
        referenceNumber: payment.number,
        referenceId: payment.id,
        createdById: payment.userId,
      });
      
      console.log(`Linked ${payment.number} to MAIN ACCOUNT and created ledger entry.`);
    }
  });
  
  console.log("Successfully migrated payments to MAIN ACCOUNT.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
