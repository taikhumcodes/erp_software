import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { DeliveryOrdersService } from './src/modules/delivery-orders/delivery-orders.service.ts';

async function run() {
  try {
    const customer = await prisma.customer.findFirst();
    const product = await prisma.product.findFirst();
    
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
    const res = await DeliveryOrdersService.create(user.id, body);
    console.log('Success:', res.id);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
