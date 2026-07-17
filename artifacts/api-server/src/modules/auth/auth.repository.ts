import { prisma } from '../../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserWithRole {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  role: {
    name: string;
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

/**
 * Data-access layer for authentication.
 * All database queries related to user lookup and session management live here.
 */
export class AuthRepository {
  /**
   * Find a user by their email address (case-insensitive).
   * Returns the user and their role, or null if not found.
   */
  async findByEmail(email: string): Promise<UserWithRole | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
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
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
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
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
