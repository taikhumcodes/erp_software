import { prisma } from './src/lib/prisma.js';
import { PaymentsRepository } from './src/modules/payments/payments.repository.js';
import { DocumentNumberService } from './src/lib/document-number.service.js';

(async () => {
  try {
    const customer = await prisma.customer.findFirst();
    const customerId = customer?.id;
    if (!customerId) throw new Error("No customer found");

    const number = await DocumentNumberService.generateNextNumber({
      model: 'payment',
      prefix: 'PAY',
      sequenceLength: 6,
    });
    console.log('Next number:', number, 'CustomerId:', customerId);

    await prisma.$transaction(async (tx) => {
      const payment = await PaymentsRepository.create(tx, {
        number,
        type: 'CUSTOMER',
        method: 'CASH',
        mode: 'IMMEDIATE',
        status: 'PENDING',
        customerId,
        amount: 1800,
        allocatedAmount: 0,
        remainingAmount: 1800,
        paymentDate: new Date(),
        referenceNumber: '',
        notes: '',
        userId: 'cmrrnrbn60006sdg52fcgaml8' // admin user id
      });
      console.log('Created!', payment.id);
      throw new Error('ROLLBACK_TEST');
    });
  } catch(err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
