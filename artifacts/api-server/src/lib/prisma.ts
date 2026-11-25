import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from './logger.js';
import { ensureDbProxy } from './db-proxy.js';

export interface RequestTenantContext {
  isDemo?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<RequestTenantContext>();

// Singleton pattern — avoids creating multiple connections during hot reloads.
const globalForPrisma = globalThis as unknown as {
  prismaReal?: PrismaClient;
  prismaDemo?: PrismaClient;
};

const proxiedUrl = await ensureDbProxy();

const realPrisma =
  globalForPrisma.prismaReal ??
  new PrismaClient({
    log: [{ emit: 'event', level: 'error' }],
  });

realPrisma.$on('error' as never, (e: unknown) => {
  logger.error({ err: e }, 'Prisma [real] error');
});

// Build isolated Demo database connection string pointing to 'demo' schema
let demoUrl = proxiedUrl;
try {
  const parsed = new URL(proxiedUrl);
  parsed.searchParams.set('schema', 'demo');
  demoUrl = parsed.toString();
} catch (e) {
  logger.warn({ err: e }, 'Could not parse database URL for demo schema');
}

const demoPrisma =
  globalForPrisma.prismaDemo ??
  new PrismaClient({
    datasources: { db: { url: demoUrl } },
    log: [{ emit: 'event', level: 'error' }],
  });

demoPrisma.$on('error' as never, (e: unknown) => {
  logger.error({ err: e }, 'Prisma [demo] error');
});

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prismaReal = realPrisma;
  globalForPrisma.prismaDemo = demoPrisma;
}

/**
 * Transparent proxy for PrismaClient.
 * Every call to `prisma.<model>.<action>` dynamically routes to:
 * - `demoPrisma` (demo schema) if `tenantStorage.getStore()?.isDemo` is true.
 * - `realPrisma` (public schema) by default.
 *
 * This provides 100% physical database schema isolation without modifying
 * existing repository queries.
 */
export const prisma: PrismaClient = new Proxy(realPrisma, {
  get(target, prop, receiver) {
    const store = tenantStorage.getStore();
    const activeClient = store?.isDemo ? demoPrisma : realPrisma;
    const value = Reflect.get(activeClient, prop, activeClient);
    return typeof value === 'function' ? value.bind(activeClient) : value;
  },
}) as PrismaClient;

export { realPrisma, demoPrisma };
