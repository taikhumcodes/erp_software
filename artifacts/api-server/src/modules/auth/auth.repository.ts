import { realPrisma } from '../../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  isDemo: boolean;
  demoExpiresAt?: Date | null;
  createdAt: Date;
  role: {
    name: string;
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for authentication.
 * All database queries related to user lookup and session management live here.
 * Note: uses realPrisma because user credentials and session logs always live in the public schema.
 */
export class AuthRepository {
  /**
   * Find a user by their email address (case-insensitive).
   * Returns the user and their role, or null if not found.
   */
  async findByEmail(email: string): Promise<UserWithRole | null> {
    return realPrisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
        createdAt: true,
        role: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Find a user by their ID.
   * Used when validating a refresh token or fetching the current user.
   */
  async findById(id: string): Promise<UserWithRole | null> {
    return realPrisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
        createdAt: true,
        role: {
          select: { name: true },
        },
      },
    });
  }

  /**
   * Update the last-login timestamp for a user.
   * Called after a successful login.
   */
  async touchLastLogin(userId: string): Promise<void> {
    await realPrisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Create a new session log on sign-in.
   */
  async createSession(data: {
    userId: string;
    userEmail: string;
    userName: string;
    isDemo: boolean;
    ipAddress?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    device?: string;
    expiresAt?: Date;
  }) {
    return realPrisma.userSessionLog.create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userName: data.userName,
        isDemo: data.isDemo,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        browser: data.browser,
        os: data.os,
        device: data.device,
        expiresAt: data.expiresAt,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Find session by ID.
   */
  async getSessionById(sessionId: string) {
    return realPrisma.userSessionLog.findUnique({
      where: { id: sessionId },
    });
  }

  /**
   * Terminate a session immediately.
   */
  async terminateSession(sessionId: string, terminatedBy?: string) {
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
   * Update last active timestamp on session.
   */
  async touchSession(sessionId: string) {
    await realPrisma.userSessionLog.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});
  }
}

export const authRepository = new AuthRepository();
