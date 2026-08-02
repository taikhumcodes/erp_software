import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.financeAccount.findFirst({ where: { name: 'Nazar' } });
  if (!account) return console.log('No Nazar account');
  console.log('Account:', account.id, account.name, account.type);
  
  const entries = await prisma.financeLedger.findMany({ 
    where: { accountId: account.id },
    orderBy: { createdAt: 'asc' }
  });
  
  console.table(entries.map(e => ({
    id: e.id,
    type: e.entryType,
    ref: e.referenceNumber,
    debit: e.debit.toString(),
    credit: e.credit.toString(),
    bal: e.runningBalance.toString()
  })));
}

main().finally(() => prisma.$disconnect());
