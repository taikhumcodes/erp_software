import type { Request, Response, NextFunction } from 'express';
import { SuppliersService } from './suppliers.service.js';

const VALID_SORT_FIELDS = ['name', 'code', 'balance', 'createdAt', 'isActive'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

export const SuppliersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      let isActive: boolean | undefined;
      if (req.query['isActive'] === 'true')  isActive = true;
      if (req.query['isActive'] === 'false') isActive = false;

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await SuppliersService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const supplier = await SuppliersService.getById(id!);
      res.json({ data: supplier });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SuppliersService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await SuppliersService.create(req.body as Record<string, unknown>);
      res.status(201).json({ data: supplier });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const supplier = await SuppliersService.update(id!, req.body as Record<string, unknown>);
      res.json({ data: supplier });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await SuppliersService.delete(id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
