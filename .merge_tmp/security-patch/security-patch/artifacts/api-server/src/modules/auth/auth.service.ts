import bcrypt from 'bcryptjs';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
} from '../../lib/jwt.js';
import { authRepository } from './auth.repository.js';
import { ForbiddenError, UnauthorizedError } from '../../errors/AppError.js';
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
   *
   * Error strategy:
   *   - Wrong email or password → 401 UnauthorizedError (generic, prevents enumeration)
   *   - Valid credentials but account inactive → 403 ForbiddenError (specific message)
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await authRepository.findByEmail(email);

    // Constant-time comparison to avoid email enumeration
    const dummyHash = '$2a$10$invalidhashfortimingattackprevention00000000000000000';
    const isValid =
      user !== null && await bcrypt.compare(password, user.passwordHash || dummyHash);

    // TASK 1: Credential check and active-status check are now separate.
    // Invalid credentials → 401 (generic, no information leak).
    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // TASK 1: Account deactivated → 403 with a specific message, as required.
    // The password was correct so we can safely reveal this without enumerating accounts.
    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated.');
    }

    // Fire-and-forget — non-critical, do not await
    authRepository.touchLastLogin(user.id).catch(() => {
      // Silently ignore — last login update is non-critical
    });

    const tokenPayload = {
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role.name as UserRole,
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
   *
   * Error strategy (TASK 2):
   *   - Token invalid/expired → 401 UnauthorizedError
   *   - User not found → 401 UnauthorizedError (no enumeration)
   *   - User found but inactive/deleted → 403 ForbiddenError
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await authRepository.findById(payload.sub);

    // TASK 2: Distinguish "not found" (401) from "found but inactive" (403).
    if (!user) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // TASK 2: Account deactivated or soft-deleted → 403.
    // This immediately blocks refresh for any deactivated/deleted account.
    if (!user.isActive) {
      throw new ForbiddenError('Account has been deactivated.');
    }

    const tokenPayload = {
      sub:   user.id,
      email: user.email,
      name:  user.name,
      role:  user.role.name as UserRole,
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
      id:        user.id,
      email:     user.email,
      name:      user.name,
      role:      user.role.name as UserRole,
      isActive:  user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }
}

export const authService = new AuthService();
