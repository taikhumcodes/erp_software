import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

// Singleton pattern — avoids creating multiple connections during hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [{ emit: 'event', level: 'error' }],
  });

// Forward Prisma error events to the app logger.
prisma.$on('error' as never, (e: unknown) => {
  logger.error({ err: e }, 'Prisma error');
});

// Re-use the same instance across hot reloads in development.
if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = prisma;
}
