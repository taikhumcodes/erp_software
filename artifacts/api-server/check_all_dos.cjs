const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const dos = await prisma.deliveryOrder.findMany({
      include: { items: true },
    });
    
    console.log('Found', dos.length, 'DOs total');
    for (const d of dos) {
      console.log('DO:', d.number, 'Status:', d.status);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
