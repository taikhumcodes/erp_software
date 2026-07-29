import type { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service.js';

export class ProductsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.list(req.query as Record<string, string>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await productsService.getOne(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getNextSku(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sku = await productsService.getNextSku();
      res.json({ sku });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productsService.create(req.body as Record<string, unknown>);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await productsService.update(
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
      await productsService.delete(id);
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const productsController = new ProductsController();
