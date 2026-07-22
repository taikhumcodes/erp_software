import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { prisma } from '../lib/prisma.js';
import type { UserRole } from '../types/index.js';

/**
 * Express middleware that validates the Bearer JWT in the Authorization header
 * and attaches the decoded user to req.user.
 *
 * TASK 3 — Live DB verification:
 * After cryptographic JWT verification, the middleware fetches the user record
 * from the database to confirm:
 *   • The user still exists (not hard-deleted).
 *   • The account is still active (not deactivated since the token was issued).
 *   • The role is read from the DB (not trusted from the JWT payload), so any
 *     role change takes effect on the very next request.
 *
 * This also serves as the SESSION INVALIDATION mechanism (TASK 4):
 * No Redis or token blacklist is required — deactivating a user in the DB
 * is sufficient to block all subsequent requests immediately.
 *
 * Usage: router.get('/protected', authenticate, handler)
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7).trim();
    const payload = verifyAccessToken(token);

    // ── TASK 3: Live DB check ──────────────────────────────────────────────────
    // Verify the user still exists and is active on every authenticated request.
    // Role is sourced from the DB so changes take effect immediately.
    const dbUser = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, isActive: true, role: true },
    });

    if (!dbUser) {
      // User was hard-deleted after the token was issued.
      throw new ForbiddenError('Account no longer exists');
    }

    if (!dbUser.isActive) {
      // Account was deactivated after the token was issued.
      // Returning 403 (not 401) because the token is cryptographically valid —
      // the account is simply not permitted to continue.
      throw new ForbiddenError('Account has been deactivated.');
    }

    req.user = {
      id:       dbUser.id,
      email:    payload.email,   // email is stable; no need to re-fetch
      name:     payload.name,    // name is stable; no need to re-fetch
      role:     dbUser.role as UserRole,  // authoritative: always from DB
      isActive: dbUser.isActive,
    };

    next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      next(err);
    } else {
      // JsonWebTokenError / TokenExpiredError from jsonwebtoken
      next(new UnauthorizedError('Invalid or expired access token'));
    }
  }
}
