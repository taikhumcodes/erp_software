import { PrismaClient } from '@prisma/client';
import { FinanceAccountsRepository } from './src/modules/finance/finance-accounts.repository.js';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.financeAccount.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, type: true }
  });

  for (const acc of accounts) {
    const balance = await FinanceAccountsRepository.calculateBalance(acc.id);
    console.log(`Account: ${acc.name} | Type: ${acc.type} | Balance: ${balance.toFixed(3)}`);
  }
}

main().finally(() => prisma.$disconnect());
