import { logger } from './logger.js';

// ─── Audit Action Types ────────────────────────────────────────────────────────

export type AuditAction =
  | 'USER_CREATED'
  | 'USER_DELETED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PASSWORD_RESET';

// ─── Audit Event Shape ─────────────────────────────────────────────────────────

interface AuditEvent {
  /** The action that was performed. */
  action: AuditAction;
  /** ID of the user performing the action. */
  actorId: string;
  /** ID of the user being acted upon. */
  targetId: string;
  /** Previous state (never include passwords). */
  oldValue?: Record<string, unknown>;
  /** New state (never include passwords). */
  newValue?: Record<string, unknown>;
  /** Client IP address, if available from the request. */
  ip?: string;
}

// ─── Audit Logger ─────────────────────────────────────────────────────────────

/**
 * Writes a structured audit entry via the existing pino logger.
 *
 * Output is a single JSON log line (production) or pretty-printed (development).
 * The `audit: true` flag makes it easy to filter/grep audit events from the log stream.
 *
 * NEVER pass password, passwordHash, or any secret into oldValue / newValue.
 */
export function auditLog(event: AuditEvent): void {
  logger.info(
    {
      audit: true,
      timestamp: new Date().toISOString(),
      action:    event.action,
      actorId:   event.actorId,
      targetId:  event.targetId,
      ...(event.oldValue !== undefined && { oldValue: event.oldValue }),
      ...(event.newValue !== undefined && { newValue: event.newValue }),
      ...(event.ip       !== undefined && { ip:       event.ip }),
    },
    `AUDIT:${event.action}`,
  );
}
