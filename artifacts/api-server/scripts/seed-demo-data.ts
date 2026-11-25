import { seedDemoData } from '../src/lib/seed-demo.js';
import { realPrisma, demoPrisma } from '../src/lib/prisma.js';

export { seedDemoData };

if (process.argv[1]?.includes('seed-demo-data')) {
  seedDemoData()
    .then(async () => {
      console.log('🎉 DEMO ENVIRONMENT FULLY SEEDED!');
      await Promise.allSettled([realPrisma.$disconnect(), demoPrisma.$disconnect()]);
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await Promise.allSettled([realPrisma.$disconnect(), demoPrisma.$disconnect()]);
      process.exit(1);
    });
}
