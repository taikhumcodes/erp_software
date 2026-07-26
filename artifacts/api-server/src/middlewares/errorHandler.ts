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
  if (err instanceof AppError || (err && typeof err === 'object' && 'statusCode' in err)) {
    const appErr = err as AppError;
    // Only log 5xx errors — 4xx are expected and noisy at INFO level
    if (appErr.statusCode >= 500) {
      req.log?.error({ err: appErr }, appErr.message);
    }

    res.status(appErr.statusCode).json({
      message: appErr.message,
      code: appErr.code,
      ...(appErr.details !== undefined ? { details: appErr.details } : {}),
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
  if (err instanceof Error) {
    res.status(500).json({
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      stack: err.stack,
      error_message: err.message
    });
    return;
  }
  res.status(500).json({ message: 'Internal server error', code: 'INTERNAL_ERROR' });
}
