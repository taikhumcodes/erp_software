import bcrypt from 'bcryptjs';
import { UsersRepository, type UserRole, type UserFilters } from './users.repository.js';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../errors/AppError.js';
import { auditLog } from '../../lib/audit.js';

// ─── Role hierarchy ───────────────────────────────────────────────────────────

const ROLE_RANK: Record<string, number> = {
  WAREHOUSE: 1,
  SALES:     2,
  MANAGER:   3,
  ADMIN:     4,
  OWNER:     5,
};

const VALID_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

function rankOf(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

function canActOn(actorRole: string, targetRole: string): boolean {
  return rankOf(actorRole) > rankOf(targetRole);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Validates password strength.
 * Returns an error message string if invalid, otherwise null.
 */
function validatePassword(password: string): string | null {
  if (password.length < 8)                           return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password))                       return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password))                       return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password))                       return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password))               return 'Password must contain at least one special character';
  return null;
}

const SALT_ROUNDS = 12;

// ─── Actor context (passed from controller via req.user) ──────────────────────

export interface ActorContext {
  id: string;
  role: string;
  /** Client IP address, if available — used for audit logging only. */
  ip?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const UsersService = {
  async list(filters: UserFilters) {
    return UsersRepository.findAll(filters);
  },

  async getById(id: string) {
    const user = await UsersRepository.findById(id);
    if (!user) throw new NotFoundError('User');
    return user;
  },

  async getStatistics() {
    return UsersRepository.getStatistics();
  },

  // ── Create ──────────────────────────────────────────────────────────────────
  async create(actor: ActorContext, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Required: email ───────────────────────────────────────────────────────
    const email = normalise(body['email'])?.toLowerCase();
    if (!email) {
      fieldErrors.push({ field: 'email', message: 'Email is required' });
    } else if (!isValidEmail(email)) {
      fieldErrors.push({ field: 'email', message: 'Email format is invalid' });
    } else if (email.length > 254) {
      fieldErrors.push({ field: 'email', message: 'Email must not exceed 254 characters' });
    }

    // ── Required: password ────────────────────────────────────────────────────
    const rawPassword = typeof body['password'] === 'string' ? body['password'] : '';
    if (!rawPassword) {
      fieldErrors.push({ field: 'password', message: 'Password is required' });
    } else {
      const pwErr = validatePassword(rawPassword);
      if (pwErr) fieldErrors.push({ field: 'password', message: pwErr });
    }

    // ── Required: name ────────────────────────────────────────────────────────
    const name = normalise(body['name']);
    if (!name) {
      fieldErrors.push({ field: 'name', message: 'Full name is required' });
    } else if (name.length > 200) {
      fieldErrors.push({ field: 'name', message: 'Name must not exceed 200 characters' });
    }

    // ── Optional: Arabic name ─────────────────────────────────────────────────
    const nameAr = normalise(body['nameAr']);
    if (nameAr && nameAr.length > 200) {
      fieldErrors.push({ field: 'nameAr', message: 'Arabic name must not exceed 200 characters' });
    }

    // ── Required: role ────────────────────────────────────────────────────────
    const role = normalise(body['role'])?.toUpperCase() as UserRole | null;
    if (!role || !(VALID_ROLES as string[]).includes(role)) {
      fieldErrors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Role hierarchy: only higher-ranked actor can create a user ─────────────
    if (!(canActOn(actor.role, role!) || (actor.role === 'OWNER' && role === 'OWNER'))) {
      if (role === 'OWNER') {
        throw new ForbiddenError('Only an OWNER can create another OWNER account');
      }
      throw new ForbiddenError('You do not have permission to create a user with that role');
    }

    // ── Uniqueness ─────────────────────────────────────────────────────────────
    const dup = await UsersRepository.findByEmail(email!);
    if (dup) throw new ConflictError('A user with this email already exists');

    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    const isActive = body['isActive'] !== undefined ? Boolean(body['isActive']) : true;

    const created = await UsersRepository.create({
      email:    email!,
      password: hashedPassword,
      name:     name!,
      nameAr,
      role:     role!,
      isActive,
    });

    // TASK 5: Audit — user creation
    auditLog({
      action:   'USER_CREATED',
      actorId:  actor.id,
      targetId: created.id,
      newValue: { email: created.email, role: created.role, isActive: created.isActive },
      ip:       actor.ip,
    });

    return created;
  },

  // ── Update profile ──────────────────────────────────────────────────────────
  async update(actor: ActorContext, id: string, body: Record<string, unknown>) {
    const target = await UsersRepository.findById(id);
    if (!target) throw new NotFoundError('User');

    // ── Role-hierarchy checks ──────────────────────────────────────────────────
    // Actor must outrank target (unless editing themselves — restricted fields only)
    if (actor.id !== id) {
      if (!canActOn(actor.role, target.role)) {
        throw new ForbiddenError('You do not have permission to edit this user');
      }
    }

    const fieldErrors: { field: string; message: string }[] = [];

    let name: string | undefined;
    if ('name' in body) {
      const n = normalise(body['name']);
      if (!n) {
        fieldErrors.push({ field: 'name', message: 'Full name is required' });
      } else if (n.length > 200) {
        fieldErrors.push({ field: 'name', message: 'Name must not exceed 200 characters' });
      } else {
        name = n;
      }
    }

    let nameAr: string | null | undefined;
    if ('nameAr' in body) {
      const n = normalise(body['nameAr']);
      if (n && n.length > 200) {
        fieldErrors.push({ field: 'nameAr', message: 'Arabic name must not exceed 200 characters' });
      } else {
        nameAr = n;
      }
    }

    let role: UserRole | undefined;
    if ('role' in body) {
      const r = normalise(body['role'])?.toUpperCase() as UserRole | null;
      if (!r || !(VALID_ROLES as string[]).includes(r)) {
        fieldErrors.push({ field: 'role', message: `Role must be one of: ${VALID_ROLES.join(', ')}` });
      } else {
        // Cannot self-demote (user cannot remove/change their own role)
        if (actor.id === id && r !== target.role) {
          throw new ForbiddenError('You cannot change your own role');
        }
        // Cannot assign a role equal to or above your own
        if (!canActOn(actor.role, r) && actor.id !== id) {
          throw new ForbiddenError('You cannot assign a role equal to or above your own');
        }
        role = r;
      }
    }

    let isActive: boolean | undefined;
    if ('isActive' in body) {
      isActive = Boolean(body['isActive']);
      // Self-deactivation is not allowed
      if (actor.id === id && !isActive) {
        throw new ForbiddenError('You cannot deactivate your own account');
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // Owner protection: if we're deactivating, verify at least one OWNER remains active
    if (target.role === 'OWNER' && isActive === false) {
      const activeOwners = await UsersRepository.countActiveOwners();
      if (activeOwners <= 1) {
        throw new ConflictError('Cannot deactivate the last active OWNER account');
      }
    }

    const updated = await UsersRepository.update(id, { name, nameAr, role, isActive });

    // TASK 5: Audit — role change
    if (role !== undefined && role !== target.role) {
      auditLog({
        action:   'USER_ROLE_CHANGED',
        actorId:  actor.id,
        targetId: id,
        oldValue: { role: target.role },
        newValue: { role },
        ip:       actor.ip,
      });
    }

    // TASK 5: Audit — status change
    if (isActive !== undefined && isActive !== target.isActive) {
      auditLog({
        action:   isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        actorId:  actor.id,
        targetId: id,
        oldValue: { isActive: target.isActive },
        newValue: { isActive },
        ip:       actor.ip,
      });
    }

    return updated;
  },

  // ── Toggle status (PATCH /:id/status) ───────────────────────────────────────
  async updateStatus(actor: ActorContext, id: string, body: Record<string, unknown>) {
    const target = await UsersRepository.findById(id);
    if (!target) throw new NotFoundError('User');

    // Self-deactivation
    if (actor.id === id) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    // Role-hierarchy check
    if (!canActOn(actor.role, target.role)) {
      throw new ForbiddenError('You do not have permission to change this user\'s status');
    }

    const isActive = body['isActive'];
    if (typeof isActive !== 'boolean') {
      throw new ValidationError('Validation failed', {
        errors: [{ field: 'isActive', message: 'isActive must be a boolean' }],
      });
    }

    // Owner protection
    if (target.role === 'OWNER' && !isActive) {
      const activeOwners = await UsersRepository.countActiveOwners();
      if (activeOwners <= 1) {
        throw new ConflictError('Cannot deactivate the last active OWNER account');
      }
    }

    const updated = await UsersRepository.updateStatus(id, isActive);

    // TASK 5: Audit — activation / deactivation
    auditLog({
      action:   isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      actorId:  actor.id,
      targetId: id,
      oldValue: { isActive: target.isActive },
      newValue: { isActive },
      ip:       actor.ip,
    });

    return updated;
  },

  // ── Reset password (PATCH /:id/password) ────────────────────────────────────
  async resetPassword(actor: ActorContext, id: string, body: Record<string, unknown>) {
    // TASK 7: Block self-reset through the admin endpoint.
    // Users must use a dedicated "change my password" flow (requiring the old password).
    if (actor.id === id) {
      throw new ForbiddenError('You cannot reset your own password through this endpoint');
    }

    const target = await UsersRepository.findById(id);
    if (!target) throw new NotFoundError('User');

    // Actor must outrank target
    if (!canActOn(actor.role, target.role)) {
      throw new ForbiddenError('You do not have permission to reset this user\'s password');
    }

    const fieldErrors: { field: string; message: string }[] = [];

    const rawPassword = typeof body['password'] === 'string' ? body['password'] : '';
    if (!rawPassword) {
      fieldErrors.push({ field: 'password', message: 'New password is required' });
    } else {
      const pwErr = validatePassword(rawPassword);
      if (pwErr) fieldErrors.push({ field: 'password', message: pwErr });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    await UsersRepository.updatePassword(id, hashedPassword);

    // TASK 5: Audit — password reset (never log old/new password values)
    auditLog({
      action:   'USER_PASSWORD_RESET',
      actorId:  actor.id,
      targetId: id,
      ip:       actor.ip,
    });
  },

  // ── Delete ──────────────────────────────────────────────────────────────────
  async delete(actor: ActorContext, id: string) {
    // Self-delete
    if (actor.id === id) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const target = await UsersRepository.findById(id);
    if (!target) throw new NotFoundError('User');

    // Role-hierarchy check
    if (!canActOn(actor.role, target.role)) {
      throw new ForbiddenError('You do not have permission to delete this user');
    }

    // Owner protection — OWNER accounts cannot be deleted
    if (target.role === 'OWNER') {
      throw new ForbiddenError(
        'OWNER accounts cannot be deleted. Deactivate the account instead.',
      );
    }

    await UsersRepository.delete(id);

    // TASK 5: Audit — user deletion
    auditLog({
      action:   'USER_DELETED',
      actorId:  actor.id,
      targetId: id,
      oldValue: { email: target.email, role: target.role },
      ip:       actor.ip,
    });
  },
};
