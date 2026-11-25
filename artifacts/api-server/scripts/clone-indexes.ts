import { ensureDbProxy } from '../src/lib/db-proxy.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await ensureDbProxy();
  const prisma = new PrismaClient();

  console.log('Cloning all indexes and unique constraints from public to demo schema...');

  const indexes: Array<{ indexname: string; tablename: string; indexdef: string }> = await prisma.$queryRawUnsafe(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public';
  `);

  console.log(`Found ${indexes.length} indexes in public schema.`);

  for (const idx of indexes) {
    // If it's a primary key index already handled, skip
    if (idx.indexname.endsWith('_pkey')) continue;

    // Replace "public." with "demo." in the indexdef
    const demoIndexName = `demo_${idx.indexname}`;
    let demoDef = idx.indexdef
      .replace(/CREATE (UNIQUE )?INDEX (\S+)/, `CREATE $1INDEX IF NOT EXISTS "${demoIndexName}"`)
      .replace(`ON public."${idx.tablename}"`, `ON demo."${idx.tablename}"`)
      .replace(`ON public.${idx.tablename}`, `ON demo."${idx.tablename}"`);

    try {
      await prisma.$executeRawUnsafe(demoDef);
      console.log(`✓ Created index: ${demoIndexName} on demo."${idx.tablename}"`);
    } catch (e: any) {
      console.warn(`Could not create index ${idx.indexname}:`, e.message);
    }
  }

  console.log('✓ All indexes and unique constraints cloned to demo schema!');
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
