import type { Request, Response, NextFunction } from 'express';
import { SalesService } from './sales.service.js';
import type { SaleStatus } from '@prisma/client';

const VALID_SORT_FIELDS = ['number', 'saleDate', 'totalAmount', 'netAmount', 'createdAt', 'status'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_STATUSES: SaleStatus[] = ['DRAFT', 'CONFIRMED', 'DELIVERED', 'CANCELLED'];

export const SalesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      const statusRaw = String(req.query['status'] ?? '').toUpperCase();
      const status = (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as SaleStatus)
        : undefined;

      const customerId = req.query['customerId'] ? String(req.query['customerId']) : undefined;

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await SalesService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
        status,
        customerId,
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
      const sale = await SalesService.getById(id!);
      res.json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await SalesService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const sale = await SalesService.create(userId, req.body as Record<string, unknown>);
      res.status(201).json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const sale = await SalesService.update(id!, userId, req.body as Record<string, unknown>);
      res.json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      
      // Pass along userId in case it's a cash sale being confirmed/delivered
      const body = { ...(req.body as Record<string, unknown>), userId: req.user!.id };

      const sale = await SalesService.updateStatus(id!, body);
      res.json({ data: sale });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await SalesService.delete(id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
