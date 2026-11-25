import type { Request, Response, NextFunction } from 'express';
import { developerService } from './developer.service.js';
import { ForbiddenError, ValidationError } from '../../errors/AppError.js';

export class DeveloperController {
  private ensureDeveloperAdmin(req: Request) {
    const user = req.user;
    if (!user || user.email !== 'admin@albunyan.com') {
      throw new ForbiddenError(
        'Access Denied: Only the Evolix developer administrator (admin@albunyan.com) is authorized to access developer controls.'
      );
    }
  }

  async listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 100;
      const sessions = await developerService.listSessions(limit);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  }

  async terminateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const id = String(req.params.id || '');
      if (!id) throw new ValidationError('Session ID is required');

      const adminEmail = req.user!.email;
      const updated = await developerService.terminateSession(id, adminEmail);
      res.json({ success: true, message: 'Session terminated immediately', data: updated });
    } catch (err) {
      next(err);
    }
  }

  async terminateAllUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const userId = String(req.params.userId || '');
      if (!userId) throw new ValidationError('User ID is required');

      const adminEmail = req.user!.email;
      const result = await developerService.terminateAllUserSessions(userId, adminEmail);
      res.json({ success: true, message: `Terminated ${result.count} active sessions`, data: result });
    } catch (err) {
      next(err);
    }
  }

  async listDemoUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const users = await developerService.listDemoUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async createDemoUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const { email, password, name, nameAr, expiresInDays } = req.body;
      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required');
      }

      const created = await developerService.createDemoUser({
        email,
        password,
        name: name || 'Demo Client',
        nameAr: nameAr || 'عميل تجريبي',
        expiresInDays: expiresInDays ? Number(expiresInDays) : 7,
      });

      res.status(201).json({ success: true, message: 'Demo account created successfully', data: created });
    } catch (err) {
      next(err);
    }
  }

  async toggleDemoUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const id = String(req.params.id || '');
      if (!id) throw new ValidationError('User ID is required');

      const adminEmail = req.user!.email;
      const updated = await developerService.toggleDemoUser(id, adminEmail);
      res.json({
        success: true,
        message: updated.isActive ? 'Demo user activated' : 'Demo user deactivated and active sessions terminated',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  async extendDemoUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const id = String(req.params.id || '');
      if (!id) throw new ValidationError('User ID is required');
      const days = req.body.days ? Number(req.body.days) : 7;

      const updated = await developerService.extendDemoUser(id, days);
      res.json({ success: true, message: `Demo account extended by ${days} days`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async resetDemoData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureDeveloperAdmin(req);
      const result = await developerService.resetDemoData();
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const developerController = new DeveloperController();
