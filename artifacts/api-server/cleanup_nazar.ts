import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const paymentNumbers = ['PAY-2026-000001', 'PAY-2026-000002', 'PAY-2026-000003', 'PAY-2026-000004', 'PAY-2026-000005'];
  
  await prisma.$transaction(async (tx) => {
    // 1. Unlink the payments from any finance account
    await tx.payment.updateMany({
      where: { number: { in: paymentNumbers } },
      data: { accountId: null }
    });

    // 2. Delete the ledger entries
    const deleted = await tx.financeLedger.deleteMany({
      where: { referenceNumber: { in: paymentNumbers } }
    });
    
    console.log(`Unlinked payments and deleted ${deleted.count} ledger entries.`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
