import bcrypt from 'bcryptjs';
import { realPrisma, demoPrisma } from '../../lib/prisma.js';
import { ValidationError, ConflictError, NotFoundError } from '../../errors/AppError.js';
import { seedDemoData } from '../../lib/seed-demo.js';

export interface CreateDemoUserInput {
  email: string;
  password?: string;
  name: string;
  nameAr?: string;
  expiresInDays?: number;
}

export class DeveloperService {
  /**
   * Get all login session logs across the system.
   */
  async listSessions(limit = 100) {
    return realPrisma.userSessionLog.findMany({
      orderBy: { loggedInAt: 'desc' },
      take: Math.min(limit, 250),
    });
  }

  /**
   * Terminate a session immediately.
   */
  async terminateSession(sessionId: string, terminatedBy: string) {
    const session = await realPrisma.userSessionLog.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    return realPrisma.userSessionLog.update({
      where: { id: sessionId },
      data: {
        status: 'TERMINATED',
        terminatedAt: new Date(),
        terminatedBy,
      },
    });
  }

  /**
   * Terminate all active sessions for a specific user.
   */
  async terminateAllUserSessions(userId: string, terminatedBy: string) {
    return realPrisma.userSessionLog.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      data: {
        status: 'TERMINATED',
        terminatedAt: new Date(),
        terminatedBy,
      },
    });
  }

  /**
   * List all demo users.
   */
  async listDemoUsers() {
    return realPrisma.user.findMany({
      where: { isDemo: true },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
        createdAt: true,
        lastLoginAt: true,
        role: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new demo user with an expiration date (default 7 days).
   */
  async createDemoUser(input: CreateDemoUserInput) {
    const cleanEmail = input.email.trim().toLowerCase();
    if (!cleanEmail) {
      throw new ValidationError('Email is required');
    }

    const existing = await realPrisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      throw new ConflictError(`A user with email ${cleanEmail} already exists`);
    }

    if (input.password !== undefined && input.password.trim() !== '' && input.password.trim().length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }
    const password = input.password && input.password.trim().length >= 6 ? input.password.trim() : 'Demo@1234';
    const passwordHash = await bcrypt.hash(password, 10);

    const days = input.expiresInDays && input.expiresInDays > 0 ? input.expiresInDays : 7;
    const demoExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Find default ADMIN or OWNER role
    let role = await realPrisma.role.findFirst({
      where: { name: 'ADMIN' },
    });
    if (!role) {
      role = await realPrisma.role.findFirst();
    }
    if (!role) {
      throw new ValidationError('No user role found in the database');
    }

    // Create in public schema (where auth queries live)
    const newUser = await realPrisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        name: input.name.trim() || 'Demo Client',
        nameAr: input.nameAr?.trim() || 'عميل تجريبي',
        roleId: role.id,
        isActive: true,
        isDemo: true,
        demoExpiresAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        nameAr: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
        createdAt: true,
        role: { select: { name: true } },
      },
    });

    // Also sync into demo schema so foreign keys in demo transactions work seamlessly
    try {
      const demoRole = await demoPrisma.role.findFirst({ where: { name: 'ADMIN' } });
      if (demoRole) {
        await demoPrisma.user.upsert({
          where: { email: cleanEmail },
          update: {
            passwordHash,
            name: input.name.trim() || 'Demo Client',
            nameAr: input.nameAr?.trim() || 'عميل تجريبي',
            isActive: true,
            isDemo: true,
            demoExpiresAt,
          },
          create: {
            id: newUser.id,
            email: cleanEmail,
            passwordHash,
            name: input.name.trim() || 'Demo Client',
            nameAr: input.nameAr?.trim() || 'عميل تجريبي',
            roleId: demoRole.id,
            isActive: true,
            isDemo: true,
            demoExpiresAt,
          },
        });
      }
    } catch {
      // Demo schema sync is auxiliary
    }

    return {
      ...newUser,
      initialPassword: password,
    };
  }

  /**
   * Toggle a demo user's active status.
   * If deactivating, terminates all active sessions immediately.
   */
  async toggleDemoUser(userId: string, adminEmail: string) {
    const user = await realPrisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Demo user');
    }

    if (!user.isDemo) {
      throw new ValidationError('Cannot toggle non-demo user through demo management');
    }

    const updated = await realPrisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
      },
    });

    if (!updated.isActive) {
      await this.terminateAllUserSessions(userId, adminEmail);
    }

    return updated;
  }

  /**
   * Extend demo account expiration date by N days.
   */
  async extendDemoUser(userId: string, additionalDays = 7) {
    const user = await realPrisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Demo user');
    }

    const baseDate = user.demoExpiresAt && user.demoExpiresAt > new Date()
      ? user.demoExpiresAt
      : new Date();

    const newExpiry = new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    return realPrisma.user.update({
      where: { id: userId },
      data: {
        demoExpiresAt: newExpiry,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
      },
    });
  }

  /**
   * Reset the demo sandbox data back to pristine realistic hardware store data.
   */
  async resetDemoData() {
    await seedDemoData();
    return { success: true, message: 'Demo environment reset successfully with fresh hardware store data' };
  }
}

export const developerService = new DeveloperService();
