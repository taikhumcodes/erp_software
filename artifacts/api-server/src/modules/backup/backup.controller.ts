import type { Request, Response, NextFunction } from 'express';
import { backupService } from './backup.service.js';
import { ForbiddenError, ValidationError } from '../../errors/AppError.js';

export class BackupController {
  private ensureSuperAdmin(req: Request) {
    const user = (req as any).user;
    if (!user || user.email !== 'admin@albunyan.com') {
      throw new ForbiddenError('Access Denied: Only system administrator (admin@albunyan.com) is authorized to manage system backups.');
    }
  }

  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureSuperAdmin(req);
      const stats = await backupService.getStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async exportBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureSuperAdmin(req);
      const user = (req as any).user;
      const backupData = await backupService.exportAll(user.email);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `al-bunyan-backup-${timestamp}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).json(backupData);
    } catch (err) {
      next(err);
    }
  }

  async importBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.ensureSuperAdmin(req);
      
      const payload = req.body;
      if (!payload || !payload.tables) {
        throw new ValidationError('Invalid backup payload: missing tables object');
      }

      const result = await backupService.restore(payload);
      res.json({
        success: true,
        message: 'System database restored successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const backupController = new BackupController();
