const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // 1. Get first product
    const product = await prisma.product.findFirst({
        where: { isActive: true },
        include: { unit: true }
    });
    console.log('Product:', product.name, 'Stock:', product.stockQuantity.toString());

    // 2. Get first customer
    const customer = await prisma.customer.findFirst();

    // 3. Create a DO in DRAFT status
    const doItem = await prisma.deliveryOrder.create({
      data: {
        number: 'DO-TEST-001',
        internalSONumber: 'SO-TEST-001',
        orderType: 'DIRECT',
        customerId: customer.id,
        customerNameSnapshot: customer.name,
        status: 'DRAFT',
        createdById: 'clk3x...', // Just any user id if not strictly validated by db constraint, wait, it has relation to User. Let's find a user.
      }
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
