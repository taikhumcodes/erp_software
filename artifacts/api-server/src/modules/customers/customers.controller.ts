import type { Request, Response, NextFunction } from 'express';
import { customersService } from './customers.service.js';

function getId(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

export class CustomersController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.list(req.query as Record<string, string>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.getOne(getId(req));
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.create(req.body as Record<string, unknown>);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customersService.update(getId(req), req.body as Record<string, unknown>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await customersService.delete(getId(req));
      res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const customersController = new CustomersController();
