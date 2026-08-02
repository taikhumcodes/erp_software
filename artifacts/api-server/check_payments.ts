import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const payments = await prisma.payment.findMany({
    where: { number: { in: ['PAY-2026-000001', 'PAY-2026-000002', 'PAY-2026-000003', 'PAY-2026-000004', 'PAY-2026-000005'] } }
  });
  console.log('Payments found:', payments.length);
  payments.forEach(p => console.log(p.number, p.status));
}
main().finally(() => prisma.$disconnect());
