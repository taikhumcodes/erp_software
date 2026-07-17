import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../errors/AppError.js';

/**
 * Express middleware that validates the Bearer JWT in the Authorization header
 * and attaches the decoded user to req.user.
 *
 * Usage: router.get('/protected', authenticate, handler)
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isActive: true,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      next(err);
    } else {
      // JsonWebTokenError / TokenExpiredError from jsonwebtoken
      next(new UnauthorizedError('Invalid or expired access token'));
    }
  }
}
