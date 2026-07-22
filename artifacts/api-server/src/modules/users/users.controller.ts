import type { Request, Response, NextFunction } from 'express';
import { UsersService, type ActorContext } from './users.service.js';
import type { UserRole } from './users.repository.js';

const VALID_SORT_FIELDS = ['name', 'email', 'role', 'createdAt', 'lastLogin', 'isActive'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

/**
 * Pull the authenticated user from req (set by authenticate middleware).
 * Also captures client IP for audit logging.
 */
function getActor(req: Request): ActorContext {
  const user = (req as Request & { user?: ActorContext }).user;
  if (!user) throw new Error('No actor on request — authenticate middleware missing');
  return {
    id:   user.id,
    role: user.role,
    ip:   req.ip ?? (req.socket?.remoteAddress ?? undefined),
  };
}

export const UsersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      let isActive: boolean | undefined;
      if (req.query['isActive'] === 'true')  isActive = true;
      if (req.query['isActive'] === 'false') isActive = false;

      const roleRaw = String(req.query['role'] ?? '').toUpperCase();
      const role = (VALID_ROLES as string[]).includes(roleRaw)
        ? (roleRaw as UserRole)
        : undefined;

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await UsersService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
        role,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await UsersService.getById(String(id));
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await UsersService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = getActor(req);
      const user = await UsersService.create(actor, req.body as Record<string, unknown>);
      res.status(201).json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = getActor(req);
      const { id } = req.params;
      const user = await UsersService.update(actor, String(id), req.body as Record<string, unknown>);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = getActor(req);
      const { id } = req.params;
      const user = await UsersService.updateStatus(actor, String(id), req.body as Record<string, unknown>);
      res.json({ data: user });
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = getActor(req);
      const { id } = req.params;
      await UsersService.resetPassword(actor, String(id), req.body as Record<string, unknown>);
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = getActor(req);
      const { id } = req.params;
      await UsersService.delete(actor, String(id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
