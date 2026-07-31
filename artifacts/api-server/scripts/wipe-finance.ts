import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting Finance Data Wipe...');

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete all FinanceAuditLogs to clear foreign key constraints
      await tx.financeAuditLog.deleteMany({});
      console.log('Deleted FinanceAuditLogs');

      // 2. Unlink Payments
      await tx.payment.updateMany({
        where: { accountId: { not: null } },
        data: { accountId: null }
      });
      console.log('Unlinked Payments from Finance Accounts');

      // 3. Delete all MoneyTransfers
      await tx.moneyTransfer.deleteMany({});
      console.log('Deleted MoneyTransfers');

      // 4. Delete all Expenses
      await tx.expense.deleteMany({});
      console.log('Deleted Expenses');

      // 5. Delete all SalaryAdvances and SalaryRecords
      await tx.salaryAdvance.deleteMany({});
      await tx.salaryRecord.deleteMany({});
      console.log('Deleted Salary Records & Advances');

      // 6. Delete all FinanceLedgers
      await tx.financeLedger.deleteMany({});
      console.log('Deleted FinanceLedgers');

      // 7. Finally delete FinanceAccounts
      const deletedAccounts = await tx.financeAccount.deleteMany({});
      console.log(`Deleted ${deletedAccounts.count} FinanceAccounts`);

      // 8. Seed 'Salary' expense category
      const salaryCategory = await tx.expenseCategory.upsert({
        where: { name: 'Salary' },
        update: {},
        create: {
          name: 'Salary',
          isDefault: false,
          isActive: true,
        }
      });
      console.log(`Ensured Expense Category: ${salaryCategory.name}`);
    });

    console.log('Finance Data Wipe & Seeding Completed Successfully.');
  } catch (error) {
    console.error('Error wiping finance data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
