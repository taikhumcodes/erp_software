import { ensureDbProxy } from '../src/lib/db-proxy.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await ensureDbProxy();
  const prisma = new PrismaClient();

  console.log('Running database schema updates...');

  // 1. Add demo columns to public.users
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMP(3);
  `);
  console.log('✓ Added is_demo and demo_expires_at columns to public.users');

  // 2. Create user_session_logs table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.user_session_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      user_name TEXT NOT NULL,
      is_demo BOOLEAN NOT NULL DEFAULT false,
      ip_address TEXT,
      user_agent TEXT,
      browser TEXT,
      os TEXT,
      device TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      logged_in_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP(3),
      terminated_at TIMESTAMP(3),
      terminated_by TEXT
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS user_session_logs_user_id_idx ON public.user_session_logs(user_id);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS user_session_logs_status_idx ON public.user_session_logs(status);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS user_session_logs_logged_in_at_idx ON public.user_session_logs(logged_in_at);
  `);
  console.log('✓ Created public.user_session_logs table and indices');

  // 3. Create demo schema
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS demo;`);
  console.log('✓ Created demo schema');

  await prisma.$disconnect();
  console.log('Done!');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
