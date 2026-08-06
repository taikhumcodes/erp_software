import type { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service.js';
import { PaymentsAllocationService } from './payments-allocation.service.js';
import { PaymentsAttachmentService } from './payments-attachment.service.js';
import type { TransactionStatus } from '@prisma/client';

const VALID_SORT_FIELDS = ['number', 'paymentDate', 'amount', 'allocatedAmount', 'createdAt', 'status'] as const;
type SortField = (typeof VALID_SORT_FIELDS)[number];

const VALID_STATUSES: TransactionStatus[] = ['PENDING', 'COMPLETED', 'CANCELLED'];

export const PaymentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(String(req.query['page']  ?? '1'),  10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10) || 20));

      const statusRaw = String(req.query['status'] ?? '').toUpperCase();
      const status = (VALID_STATUSES as string[]).includes(statusRaw)
        ? (statusRaw as TransactionStatus)
        : undefined;

      const customerId = req.query['customerId'] ? String(req.query['customerId']) : undefined;
      const supplierId = req.query['supplierId'] ? String(req.query['supplierId']) : undefined;
      const days = req.query['days'] ? parseInt(String(req.query['days']), 10) : undefined;
      const typeRaw = req.query['type'] ? String(req.query['type']) : undefined;
      const type = typeRaw as any; // Cast as any or PaymentType
      const methodRaw = req.query['method'] ? String(req.query['method']) : undefined;
      const method = methodRaw as any; // Cast as any or PaymentMethod

      const sortByRaw = String(req.query['sortBy'] ?? 'createdAt');
      const sortBy: SortField = (VALID_SORT_FIELDS as readonly string[]).includes(sortByRaw)
        ? (sortByRaw as SortField)
        : 'createdAt';

      const sortOrder = req.query['sortOrder'] === 'asc' ? 'asc' : 'desc';

      const result = await PaymentsService.list({
        search: req.query['search'] ? String(req.query['search']) : undefined,
        status,
        type,
        method,
        customerId,
        supplierId,
        days,
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
      const payment = await PaymentsService.getById(id!);
      res.json({ data: payment });
    } catch (err) {
      next(err);
    }
  },

  async getStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await PaymentsService.getStatistics();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || 'admin-id-mock';
      const payment = await PaymentsService.create(userId, req.body as Record<string, unknown>);
      res.status(201).json({ data: payment });
    } catch (err: any) {
      console.error("PAYMENT CREATE ERROR:", err);
      res.status(500).json({ message: err?.message, stack: err?.stack, orig: err });
    }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const body = { ...(req.body as Record<string, unknown>), userId } as { status: TransactionStatus; userId: string; [key: string]: any };
      
      const payment = await PaymentsService.updateStatus(id!, body);
      res.json({ data: payment });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await PaymentsService.delete(id!);
      res.json({ message: 'Payment deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  // ── Allocations ──────────────────────────────────────────────────────────

  async allocate(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      const body = { ...(req.body as Record<string, unknown>), userId };
      
      const allocation = await PaymentsAllocationService.allocate(id!, body);
      res.status(201).json({ data: allocation });
    } catch (err) {
      next(err);
    }
  },

  async removeAllocation(req: Request, res: Response, next: NextFunction) {
    try {
      const paymentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const allocationId = Array.isArray(req.params.allocationId) ? req.params.allocationId[0] : req.params.allocationId;
      const userId = req.user!.id;
      
      await PaymentsAllocationService.removeAllocation(paymentId!, allocationId!, userId);
      res.json({ message: 'Allocation removed successfully' });
    } catch (err) {
      next(err);
    }
  },

  // ── Attachments ──────────────────────────────────────────────────────────

  async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.user!.id;
      
      if (!req.file) {
        res.status(400).json({ message: 'No file uploaded', code: 'VALIDATION_ERROR' });
        return;
      }
      
      const category = req.body['category'] as string | undefined;

      const attachment = await PaymentsAttachmentService.uploadAttachment(id!, userId, req.file, category);
      res.status(201).json({ data: attachment });
    } catch (err) {
      next(err);
    }
  },

  async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
      const { path, originalName, mimeType } = await PaymentsAttachmentService.getAttachmentFile(attachmentId!);
      
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.setHeader('Content-Type', mimeType);
      res.sendFile(path);
    } catch (err) {
      next(err);
    }
  },

  async previewAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
      const { path, mimeType } = await PaymentsAttachmentService.getAttachmentFile(attachmentId!);
      
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', mimeType);
      res.sendFile(path);
    } catch (err) {
      next(err);
    }
  },

  async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
      const userId = req.user!.id;
      
      await PaymentsAttachmentService.deleteAttachment(attachmentId!, userId);
      res.json({ message: 'Attachment deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
};
