const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const doItem = await prisma.deliveryOrder.findFirst({
      include: { items: true },
      where: { status: 'DRAFT' }
    });
    
    if (!doItem) {
      console.log('No DRAFT DO found.');
      return;
    }

    // Try to update DO to DISPATCHED
    console.log('Trying to update DO', doItem.id);
    
    await prisma.$transaction(async (tx) => {
      for (const item of doItem.items) {
         const qty = Number(item.quantity);
         if (qty > 0) {
            console.log('Decreasing stock for product', item.productId, 'by', qty);
            
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            console.log('Current stock:', product.stockQuantity);
            
            const newStock = product.stockQuantity - qty; // Using simple JS numbers for logging
            
            console.log('New stock will be:', newStock);
            
            if (newStock < 0) {
              throw new Error('Insufficient stock');
            }
         }
      }
    });
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
