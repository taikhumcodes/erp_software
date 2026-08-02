import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { DeliveryOrdersService } from './src/modules/delivery-orders/delivery-orders.service.ts';

async function run() {
  try {
    const customer = await prisma.customer.findFirst();
    const product = await prisma.product.findFirst();
    
    if (!customer || !product) {
      throw new Error("Ensure at least one customer and product exist in the DB.");
    }

    const body = {
        customerId: customer.id,
        orderType: 'DIRECT',
        deliveryDate: new Date().toISOString(),
        items: [{
          productId: product.id,
          quantity: '50'
        }]
    };
    
    const user = await prisma.user.findFirst();
    if (!user) {
      throw new Error("Ensure at least one user exists in the DB.");
    }
    const res = await DeliveryOrdersService.create(user.id, body);
    console.log('Success:', res.id);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
