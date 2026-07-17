import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../lib/logger.js';

/**
 * Centralized Express error handler.
 * Must be registered LAST in the middleware chain (after all routes).
 *
 * Serializes AppError subclasses into a consistent JSON shape:
 *   { message, code, details? }
 *
 * Unknown errors become 500 Internal Server Error.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // ── Known application error ──────────────────────────────────────────────
  if (err instanceof AppError) {
    // Only log 5xx errors — 4xx are expected and noisy at INFO level
    if (err.statusCode >= 500) {
      req.log?.error({ err }, err.message);
    }

    res.status(err.statusCode).json({
      message: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
    return;
  }

  // ── JWT library errors ───────────────────────────────────────────────────
  if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
      return;
    }
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
  }

  // ── Unexpected error ─────────────────────────────────────────────────────
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
}
