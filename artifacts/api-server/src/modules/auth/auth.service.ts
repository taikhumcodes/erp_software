import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} from '../../lib/jwt.js';
import { authRepository, type UserWithRole } from './auth.repository.js';
import { ForbiddenError, UnauthorizedError } from '../../errors/AppError.js';
import type { UserRole } from '../../types/index.js';
import type { ClientMeta } from '../../lib/user-agent.js';

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  isDemo: boolean;
  demoExpiresAt?: string | null;
  createdAt: string; // ISO 8601
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Validate credentials, log session, and return a token pair + user profile on success.
   */
  async login(email: string, password: string, clientMeta?: ClientMeta): Promise<AuthResponse> {
    const user = await authRepository.findByEmail(email);

    // Constant-time comparison to avoid email enumeration
    const dummyHash = '$2a$10$invalidhashfortimingattackprevention00000000000000000';
    const isValid =
      user !== null && await bcrypt.compare(password, user.passwordHash || dummyHash);

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated.');
    }

    // Check demo expiry if applicable
    if (user.isDemo && user.demoExpiresAt && new Date() > user.demoExpiresAt) {
      throw new ForbiddenError('This demo account access has expired. Please contact the administrator.');
    }

    // Demo sessions expire in 7 days as requested; real accounts in 30 days
    const sessionExpiresInMs = user.isDemo ? 7 * 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000;
    const expiresAt = new Date(Date.now() + sessionExpiresInMs);

    // Record session audit log
    const session = await authRepository.createSession({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      isDemo: user.isDemo,
      ipAddress: clientMeta?.ipAddress,
      userAgent: clientMeta?.userAgent,
      browser: clientMeta?.browser,
      os: clientMeta?.os,
      device: clientMeta?.device,
      expiresAt,
    });

    // Fire-and-forget — non-critical, do not await
    authRepository.touchLastLogin(user.id).catch(() => {});

    const tokenPayload = {
      sub:       user.id,
      email:     user.email,
      name:      user.name,
      role:      user.role.name as UserRole,
      isDemo:    user.isDemo,
      sessionId: session.id,
    };

    return {
      user: this.toProfile(user),
      tokens: {
        accessToken:  signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
        expiresIn:    ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  /**
   * Issue new tokens from a valid refresh token.
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    let payload: any;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await authRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated.');
    }

    if (user.isDemo && user.demoExpiresAt && new Date() > user.demoExpiresAt) {
      throw new ForbiddenError('This demo account access has expired.');
    }

    // Verify session status if sessionId present
    if (payload.sessionId) {
      const session = await authRepository.getSessionById(payload.sessionId);
      if (session) {
        if (session.status === 'TERMINATED') {
          throw new ForbiddenError('Your session has been terminated by the administrator.');
        }
        if (session.status === 'LOGGED_OUT') {
          throw new UnauthorizedError('Your session has ended. Please sign in again.');
        }
        if (session.expiresAt && new Date() > session.expiresAt) {
          throw new ForbiddenError('Your session has expired.');
        }
        authRepository.touchSession(session.id);
      }
    }

    const tokenPayload = {
      sub:       user.id,
      email:     user.email,
      name:      user.name,
      role:      user.role.name as UserRole,
      isDemo:    user.isDemo,
      sessionId: payload.sessionId,
    };

    return {
      user: this.toProfile(user),
      tokens: {
        accessToken:  signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
        expiresIn:    ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  /**
   * Fetch the current user's profile by their ID.
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }
    return this.toProfile(user);
  }

  /**
   * End an active session on explicit logout.
   */
  async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      await authRepository.endSession(sessionId);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private toProfile(user: UserWithRole): UserProfile {
    return {
      id:            user.id,
      email:         user.email,
      name:          user.name,
      role:          user.role.name as UserRole,
      isActive:      user.isActive,
      isDemo:        user.isDemo,
      demoExpiresAt: user.demoExpiresAt ? user.demoExpiresAt.toISOString() : null,
      createdAt:     user.createdAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
