import type { Request, Response, NextFunction } from 'express';
import { categoriesService } from './categories.service.js';

export class CategoriesController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await categoriesService.list(req.query as Record<string, string>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await categoriesService.getOne(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await categoriesService.create(req.body as Record<string, unknown>);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await categoriesService.update(
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
      await categoriesService.delete(id);
      res.json({ message: 'Category deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const categoriesController = new CategoriesController();
