import type { Request, Response, NextFunction } from 'express';
import { brandsService } from './brands.service.js';

export class BrandsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await brandsService.list(req.query as Record<string, string>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await brandsService.getOne(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await brandsService.create(req.body as Record<string, unknown>);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await brandsService.update(
        id,
        req.body as Record<string, unknown>,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await brandsService.delete(id);
      res.json({ message: 'Brand deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const brandsController = new BrandsController();
