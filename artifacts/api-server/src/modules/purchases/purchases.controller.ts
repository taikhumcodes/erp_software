import type { Request, Response, NextFunction } from 'express';
import { PurchasesService } from './purchases.service.js';
import type { PurchaseStatus } from '@prisma/client';

const VALID_SORT_FIELDS = ['number', 'purchaseDate', 'totalAmount', 'netAmount', 'createdAt', 'status'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_STATUSES: PurchaseStatus[] = ['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'];

export const PurchasesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      const statusRaw = String(req.query['status'] ?? '').toUpperCase();
      const status = (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as PurchaseStatus)
        : undefined;

      const supplierId = req.query['supplierId'] ? String(req.query['supplierId']) : undefined;

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await PurchasesService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
        status,
        supplierId,
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
      const purchase = await PurchasesService.getById(id!);
      res.json({ data: purchase });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await PurchasesService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const purchase = await PurchasesService.create(userId, req.body as Record<string, unknown>);
      res.status(201).json({ data: purchase });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const purchase = await PurchasesService.update(id!, userId, req.body as Record<string, unknown>);
      res.json({ data: purchase });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const purchase = await PurchasesService.updateStatus(id!, req.body as Record<string, unknown>);
      res.json({ data: purchase });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await PurchasesService.delete(id!);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
