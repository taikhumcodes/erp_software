const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const dos = await prisma.deliveryOrder.findMany({
      include: { items: true },
      where: { status: 'DISPATCHED' }
    });
    
    console.log('Found', dos.length, 'DISPATCHED DOs');
    for (const d of dos) {
      console.log('DO:', d.number);
      for (const i of d.items) {
         console.log('  Item:', i.productCodeSnapshot, 'qty:', i.quantity.toString());
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
