const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    const dos = await prisma.deliveryOrder.findMany({ include: { history: true, items: true } });
    console.log(JSON.stringify(dos, null, 2));
    
    // Also log the products
    const products = await prisma.product.findMany();
    console.log('Products:', JSON.stringify(products.map(p => ({ id: p.id, stock: p.stockQuantity })), null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
run();
