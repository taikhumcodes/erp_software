import type { Request, Response, NextFunction } from 'express';
import { unitsService } from './units.service.js';

export class UnitsController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await unitsService.list(req.query as Record<string, string>);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await unitsService.getOne(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await unitsService.create(req.body as Record<string, unknown>);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await unitsService.update(
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
      await unitsService.delete(id);
      res.json({ message: 'Unit deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export const unitsController = new UnitsController();
