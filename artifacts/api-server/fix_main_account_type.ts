import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const mainAccount = await prisma.financeAccount.findFirst({
    where: { name: 'MAIN ACCOUNT' }
  });

  if (mainAccount) {
    console.log(`MAIN ACCOUNT is currently of type: ${mainAccount.type}`);
    if (mainAccount.type !== 'BANK') {
      await prisma.financeAccount.update({
        where: { id: mainAccount.id },
        data: { type: 'BANK' }
      });
      console.log('Successfully updated MAIN ACCOUNT to type BANK.');
    } else {
      console.log('MAIN ACCOUNT is already of type BANK.');
    }
  } else {
    console.log('MAIN ACCOUNT not found.');
  }
}

main().finally(() => prisma.$disconnect());
