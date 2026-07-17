/**
 * Shared domain types for the ERP API server.
 * These mirror the OpenAPI-generated types but are kept here
 * to avoid circular imports in server-side code.
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';

/**
 * The payload embedded in JWT access/refresh tokens.
 */
export interface JwtPayload {
  /** User ID (subject claim) */
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * The authenticated user attached to every protected request.
 * Available as req.user after the authenticate middleware.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

// Augment Express Request so TypeScript knows req.user is AuthUser
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
