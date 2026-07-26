import { prisma } from './dist/lib/prisma.js';
import { PaymentsRepository } from './dist/modules/payments/payments.repository.js';

(async () => {
  try {
    const number = await PaymentsRepository.generateNextNumber();
    console.log('Next number:', number);
    await prisma.$transaction(async (tx) => {
      const payment = await PaymentsRepository.create(tx, {
        number,
        type: 'CUSTOMER',
        method: 'CASH',
        mode: 'IMMEDIATE',
        status: 'PENDING',
        customerId: 'cmrrnt521000m9r2b8r48r48r', // dummy customer id
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
