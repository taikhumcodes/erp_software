import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import { realPrisma, tenantStorage } from '../lib/prisma.js';
import type { UserRole } from '../types/index.js';

/**
 * Express middleware that validates the Bearer JWT in the Authorization header,
 * validates the active session in user_session_logs, verifies account status,
 * and transparently sets the tenantStorage (demo vs real) for downstream queries.
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

    // Live DB check on realPrisma (users and sessions reside in public schema)
    const dbUser = await realPrisma.user.findUnique({
      where:  { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        isDemo: true,
        demoExpiresAt: true,
        role: { select: { name: true } },
      },
    });

    if (!dbUser) {
      throw new ForbiddenError('Account no longer exists');
    }

    if (!dbUser.isActive) {
      throw new ForbiddenError('Account has been deactivated.');
    }

    // Check demo expiry if applicable
    if (dbUser.isDemo && dbUser.demoExpiresAt && new Date() > dbUser.demoExpiresAt) {
      throw new ForbiddenError('Demo account access has expired. Please contact the administrator.');
    }

    // Verify session status if sessionId is present in token
    if (payload.sessionId) {
      const session = await realPrisma.userSessionLog.findUnique({
        where: { id: payload.sessionId },
      });

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

        // Fire-and-forget update of lastActiveAt
        realPrisma.userSessionLog.update({
          where: { id: session.id },
          data: { lastActiveAt: new Date() },
        }).catch(() => {});
      }
    }

    req.user = {
      id:        dbUser.id,
      email:     dbUser.email,
      name:      dbUser.name,
      role:      dbUser.role.name as UserRole,
      isActive:  dbUser.isActive,
      isDemo:    dbUser.isDemo,
      sessionId: payload.sessionId,
    };

    // Run downstream request handlers within tenantStorage context
    // If isDemo is true, all prisma.* queries transparently hit the 'demo' schema.
    tenantStorage.run({ isDemo: dbUser.isDemo }, () => {
      next();
    });
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      next(err);
    } else {
      next(new UnauthorizedError('Invalid or expired access token'));
    }
  }
}
