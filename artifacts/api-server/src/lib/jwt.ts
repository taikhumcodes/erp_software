import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../types/index.js';

// ─── Config ──────────────────────────────────────────────────────────────────
// In production these must be strong random secrets passed via environment.
const ACCESS_SECRET =
  process.env['JWT_ACCESS_SECRET'] ?? 'erp-access-secret-change-in-production';

const REFRESH_SECRET =
  process.env['JWT_REFRESH_SECRET'] ?? 'erp-refresh-secret-change-in-production';

/** Access token lifetime in seconds (15 minutes) */
export const ACCESS_TOKEN_EXPIRES_IN = 15 * 60;

/** Refresh token lifetime in seconds (7 days) */
export const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60;

// ─── Token generation ────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// ─── Token verification ──────────────────────────────────────────────────────

/**
 * Verifies and decodes an access token.
 * Throws a jwt.JsonWebTokenError or jwt.TokenExpiredError on failure.
 */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

/**
 * Verifies and decodes a refresh token.
 * Throws a jwt.JsonWebTokenError or jwt.TokenExpiredError on failure.
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
