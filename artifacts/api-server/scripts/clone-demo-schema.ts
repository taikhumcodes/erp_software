import { ensureDbProxy } from '../src/lib/db-proxy.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await ensureDbProxy();
  const prisma = new PrismaClient();

  console.log('Cloning table structures from public to demo schema...');

  // Get all table names in public schema
  const tables: Array<{ tablename: string }> = await prisma.$queryRawUnsafe(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `);

  console.log(`Found ${tables.length} tables in public schema.`);

  // Drop and recreate demo schema clean
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS demo CASCADE;`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA demo;`);

  // Clone each table structure with LIKE INCLUDING DEFAULTS INCLUDING IDENTITY
  for (const t of tables) {
    const tableName = t.tablename;
    console.log(`Cloning table: ${tableName}`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE demo."${tableName}" (LIKE public."${tableName}" INCLUDING DEFAULTS INCLUDING IDENTITY);
    `);
  }

  // Clone primary keys
  for (const t of tables) {
    const tableName = t.tablename;
    try {
      await prisma.$executeRawUnsafe(`
        DO $$
        DECLARE
          pk_col text;
        BEGIN
          SELECT a.attname INTO pk_col
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = 'public."${tableName}"'::regclass AND i.indisprimary
          LIMIT 1;

          IF pk_col IS NOT NULL THEN
            EXECUTE format('ALTER TABLE demo."%s" ADD PRIMARY KEY (%I)', '${tableName}', pk_col);
          END IF;
        END $$;
      `);
    } catch (e: any) {
      console.warn(`Could not set PK for ${tableName}:`, e.message);
    }
  }

  console.log('✓ Successfully cloned all table structures to demo schema!');

  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
