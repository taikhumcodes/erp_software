import type { Request, Response, NextFunction } from 'express';
import { DeliveryOrdersService } from './delivery-orders.service.js';
import type { DeliveryOrderStatus } from '@prisma/client';

const VALID_SORT_FIELDS = ['number', 'deliveryDate', 'createdAt', 'status'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_STATUSES: DeliveryOrderStatus[] = ['DRAFT', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'];

export const DeliveryOrdersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      const statusRaw = String(req.query['status'] ?? '').toUpperCase();
      const status = (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as DeliveryOrderStatus)
        : undefined;
        
      const invoiceStatusRaw = String(req.query['invoiceStatus'] ?? '').toUpperCase();
      const invoiceStatus = (['NOT_INVOICED', 'INVOICED'] as string[]).includes(invoiceStatusRaw)
        ? (invoiceStatusRaw as any)
        : undefined;

      const customerId = req.query['customerId'] ? String(req.query['customerId']) : undefined;
      const salesOrderId = req.query['salesOrderId'] ? String(req.query['salesOrderId']) : undefined;
      const dateFrom = req.query['dateFrom'] ? String(req.query['dateFrom']) : undefined;
      const dateTo = req.query['dateTo'] ? String(req.query['dateTo']) : undefined;
      const createdById = req.query['createdById'] ? String(req.query['createdById']) : undefined;

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await DeliveryOrdersService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
        status,
        invoiceStatus,
        customerId,
        dateFrom,
        dateTo,
        createdById,
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
      const order = await DeliveryOrdersService.getById(id!);
      res.json({ data: order });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DeliveryOrdersService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },


  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const order = await DeliveryOrdersService.create(userId, req.body as Record<string, unknown>);
      res.status(201).json({ data: order });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const order = await DeliveryOrdersService.update(id!, req.body as Record<string, unknown>);
      res.json({ data: order });
    } catch (err) {
      next(err);
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const body = req.body as Record<string, unknown>;
      const status = String(body['status']) as DeliveryOrderStatus;
      const order = await DeliveryOrdersService.updateStatus(userId, id!, status, body);
      res.json({ data: order });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await DeliveryOrdersService.delete(id!, req.user!.role);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const order = await DeliveryOrdersService.duplicate(userId, id!);
      res.status(201).json({ data: order });
    } catch (err) {
      next(err);
    }
  },
};
