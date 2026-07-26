/**
 * Base application error class.
 * All domain errors extend this so the central error handler
 * can serialize them into a consistent JSON shape.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string = 'ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — Missing or invalid authentication token */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 403 — Authenticated but insufficient permissions */
export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 — Resource not found */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/** 422 — Input validation failed */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

/** 409 — Unique constraint or state conflict */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
