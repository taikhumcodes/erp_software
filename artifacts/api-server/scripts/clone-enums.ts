import { ensureDbProxy } from '../src/lib/db-proxy.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await ensureDbProxy();
  const prisma = new PrismaClient();

  console.log('Cloning all ENUM types from public to demo schema...');

  const enums: Array<{ typname: string; enum_labels: string }> = await prisma.$queryRawUnsafe(`
    SELECT t.typname, string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) AS enum_labels
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY t.typname;
  `);

  console.log(`Found ${enums.length} enums in public schema.`);

  for (const item of enums) {
    const typeName = item.typname;
    const labels = item.enum_labels;
    console.log(`Creating enum demo."${typeName}" with values: ${labels}`);
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'demo' AND t.typname = '${typeName}') THEN
          CREATE TYPE demo."${typeName}" AS ENUM (${labels});
        END IF;
      END $$;
    `);
  }

  // Also convert any columns in demo tables that use public enums to use demo enums
  const enumCols: Array<{ table_name: string; column_name: string; udt_name: string }> = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'demo' AND data_type = 'USER-DEFINED';
  `);

  console.log(`Found ${enumCols.length} enum columns in demo schema. Pointing them to demo enums...`);
  for (const col of enumCols) {
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE demo."${col.table_name}"
        ALTER COLUMN "${col.column_name}" TYPE demo."${col.udt_name}"
        USING "${col.column_name}"::text::demo."${col.udt_name}";
      `);
      console.log(`✓ Converted demo."${col.table_name}"."${col.column_name}" to demo."${col.udt_name}"`);
    } catch (e: any) {
      console.warn(`Could not convert ${col.table_name}.${col.column_name}:`, e.message);
    }
  }

  console.log('✓ Successfully cloned enums and updated demo schema columns!');
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
