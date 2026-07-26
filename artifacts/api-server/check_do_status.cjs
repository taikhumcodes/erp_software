const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const dos = await prisma.deliveryOrder.findMany({ select: { number: true, status: true, invoiceStatus: true } });
  console.log('DOs:', dos);
  await prisma.$disconnect();
}
run();
