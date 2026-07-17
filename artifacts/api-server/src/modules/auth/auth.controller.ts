import type { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { ValidationError } from '../../errors/AppError.js';

/**
 * HTTP layer for authentication endpoints.
 * Responsibilities: parse request, call service, send response.
 * All error handling is delegated to the central errorHandler middleware.
 */
export class AuthController {
  /**
   * POST /api/auth/login
   * Body: { email: string; password: string }
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as { email?: unknown; password?: unknown };

      if (typeof email !== 'string' || !email.trim()) {
        throw new ValidationError('email is required');
      }
      if (typeof password !== 'string' || password.length < 6) {
        throw new ValidationError('password must be at least 6 characters');
      }

      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout (protected)
   * Stateless JWT implementation — client should discard its tokens.
   * A token blocklist (Redis-backed) can be added here in a future iteration.
   */
  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Future: add token to a blocklist here
      res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   * Body: { refreshToken: string }
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as { refreshToken?: unknown };

      if (typeof refreshToken !== 'string' || !refreshToken.trim()) {
        throw new ValidationError('refreshToken is required');
      }

      const result = await authService.refreshTokens(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/auth/me (protected)
   * Returns the profile of the currently authenticated user.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // req.user is populated by the authenticate middleware
      const user = await authService.getProfile(req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
