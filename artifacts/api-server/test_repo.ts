import { PrismaClient } from '@prisma/client';
import { DeliveryOrdersRepository } from './src/modules/delivery-orders/delivery-orders.repository';

async function run() {
  try {
    const res = await DeliveryOrdersRepository.findAll({ invoiceStatus: 'NOT_INVOICED' });
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
