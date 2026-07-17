import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
} from '../../lib/jwt.js';
import { authRepository } from './auth.repository.js';
import { UnauthorizedError } from '../../errors/AppError.js';
import type { UserRole } from '../../types/index.js';

// ─── Response Shapes ─────────────────────────────────────────────────────────
// These match the OpenAPI-defined schemas (AuthResponse, UserProfile).

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string; // ISO 8601
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * Business logic layer for authentication.
 * Coordinates between the repository (data) and JWT utilities (tokens).
 */
export class AuthService {
  /**
   * Validate credentials and return a token pair + user profile on success.
   * Throws UnauthorizedError on invalid email, password, or inactive account.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await authRepository.findByEmail(email);

    // Constant-time comparison to avoid email enumeration
    const dummyHash = '$2a$10$invalidhashfortimingattackprevention00000000000000000';
    const isValid =
      user !== null && await bcrypt.compare(password, user.passwordHash || dummyHash);

    if (!user || !isValid || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Fire-and-forget — non-critical, do not await
    authRepository.touchLastLogin(user.id).catch(() => {
      // Silently ignore — last login update is non-critical
    });

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name as UserRole,
    };

    return {
      user: this.toProfile(user),
      tokens: {
        accessToken: signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  /**
   * Issue new tokens from a valid refresh token.
   * Re-fetches the user from DB to ensure they're still active.
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await authRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or inactive');
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name as UserRole,
    };

    return {
      user: this.toProfile(user),
      tokens: {
        accessToken: signAccessToken(tokenPayload),
        refreshToken: signRefreshToken(tokenPayload),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      },
    };
  }

  /**
   * Fetch the current user's profile by their ID (from the JWT sub claim).
   */
  async getProfile(userId: string): Promise<UserProfile> {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }
    return this.toProfile(user);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private toProfile(user: {
    id: string;
    email: string;
    name: string;
    role: { name: string };
    isActive: boolean;
    createdAt: Date;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role.name as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
