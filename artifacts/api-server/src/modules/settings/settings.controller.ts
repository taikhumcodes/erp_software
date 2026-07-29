/**
 * Settings Controller
 *
 * HTTP layer for settings endpoints.
 * Responsibilities: parse request, call service, send response.
 */
import type { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service.js';
import { ValidationError } from '../../errors/AppError.js';

export class SettingsController {

  /**
   * GET /api/settings/:namespace
   */
  async getByNamespace(req: Request, res: Response, next: NextFunction) {
    try {
      const namespace = req.params.namespace as string;
      const data = await settingsService.getByNamespace(namespace);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/settings/:namespace/:key
   */
  async getSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const namespace = req.params.namespace as string;
      const key = req.params.key as string;
      const data = await settingsService.getSetting(namespace, key);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/settings/:namespace/:key
   */
  async upsertSetting(req: Request, res: Response, next: NextFunction) {
    try {
      const namespace = req.params.namespace as string;
      const key = req.params.key as string;
      const value = req.body;
      if (!value || typeof value !== 'object') {
        throw new ValidationError('Request body must be a JSON object');
      }
      const userId = req.user?.id ?? 'system';
      const result = await settingsService.upsertSetting(namespace, key, value, userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/settings/:namespace/:key/history
   */
  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const namespace = req.params.namespace as string;
      const key = req.params.key as string;
      const history = await settingsService.getHistory(namespace, key);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/settings/reset
   * Body: { namespace: string, key?: string }
   */
  async reset(req: Request, res: Response, next: NextFunction) {
    try {
      const { namespace, key } = req.body as { namespace?: string; key?: string };
      if (!namespace) {
        throw new ValidationError('namespace is required');
      }
      const userId = req.user?.id ?? 'system';
      const result = await settingsService.resetSettings(namespace, key, userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/settings/reset-database
   * Body: { password: string }
   */
  async resetDatabase(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body as { password?: string };
      if (!password) {
        throw new ValidationError('password is required');
      }
      const userId = req.user?.id;
      if (!userId) {
        throw new ValidationError('Unauthorized');
      }
      const result = await settingsService.resetDatabase(password, userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/settings/export
   */
  async exportAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await settingsService.exportAll();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/settings/import
   * Body: { settings: { [namespace]: { [key]: value } } }
   */
  async importAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { settings } = req.body as { settings?: Record<string, Record<string, unknown>> };
      if (!settings || typeof settings !== 'object') {
        throw new ValidationError('settings object is required');
      }
      const userId = req.user?.id ?? 'system';
      const result = await settingsService.importAll(settings, userId);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/settings/upload/logo
   * Handled via multer in routes — file available as req.file
   */
  async uploadLogo(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      // The file has been saved by multer to uploads/company/
      const filePath = `/uploads/company/${req.file.filename}`;

      // Update the company profile logo URL
      const userId = req.user?.id ?? 'system';
      const existing = await settingsService.getSetting('company', 'profile');
      const updated = { ...(existing.value as Record<string, unknown>), logoUrl: filePath };
      await settingsService.upsertSetting('company', 'profile', updated, userId);

      res.json({
        data: {
          url: filePath,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const settingsController = new SettingsController();
