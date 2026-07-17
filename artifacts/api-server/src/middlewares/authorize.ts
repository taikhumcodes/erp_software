import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';
import type { UserRole } from '../types/index.js';

/**
 * Role hierarchy — higher index means broader permissions.
 * OWNER has the highest access level.
 */
const ROLE_HIERARCHY: readonly UserRole[] = [
  'WAREHOUSE',
  'SALES',
  'MANAGER',
  'ADMIN',
  'OWNER',
] as const;

/**
 * Allow only users whose role is in the provided list.
 *
 * @example
 * router.delete('/users/:id', authenticate, hasRole('OWNER', 'ADMIN'), handler)
 */
export function hasRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Required role: ${allowedRoles.join(' or ')}`),
      );
    }

    next();
  };
}

/**
 * Allow only users whose role is at least as privileged as minRole.
 *
 * @example
 * router.get('/reports', authenticate, hasMinRole('MANAGER'), handler)
 */
export function hasMinRole(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());

    const userIndex = ROLE_HIERARCHY.indexOf(req.user.role);
    const minIndex = ROLE_HIERARCHY.indexOf(minRole);

    if (userIndex < minIndex) {
      return next(
        new ForbiddenError(`Minimum required role: ${minRole}`),
      );
    }

    next();
  };
}
