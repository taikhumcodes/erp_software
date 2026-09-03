import type { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service.js';
import { ForbiddenError } from '../../errors/AppError.js';
import { verifyAccessToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';

function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

export const AnalyticsController = {
  async trackClick(req: Request, res: Response, next: NextFunction) {
    try {
      const { source, targetUrl } = req.body || {};
      const ipAddress = getClientIp(req);
      const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;
      const referrer = typeof req.headers['referer'] === 'string' ? req.headers['referer'] : null;

      let userId: string | null = null;
      let userName: string | null = null;
      let userEmail: string | null = null;
      let userRole: string | null = null;

      // Extract optional authenticated user if bearer token is supplied
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7).trim();
          const payload = verifyAccessToken(token);
          if (payload?.sub) {
            const dbUser = await prisma.user.findUnique({
              where: { id: payload.sub },
              select: { id: true, name: true, email: true, role: { select: { name: true } } },
            });
            if (dbUser) {
              userId = dbUser.id;
              userName = dbUser.name;
              userEmail = dbUser.email;
              userRole = dbUser.role.name;
            }
          }
        } catch {
          // Token invalid or expired — treat as guest click without failing
        }
      }

      await AnalyticsService.trackClick({
        source: source || 'SIDEBAR',
        targetUrl,
        userId,
        userName,
        userEmail,
        userRole,
        ipAddress,
        userAgent,
        referrer,
      });

      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  },

  async getPageVisits(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (user?.email?.toLowerCase() !== 'admin@albunyan.com') {
        throw new ForbiddenError('Only admin@albunyan.com can view page visit analytics');
      }

      const page = parseInt(String(req.query['page'] ?? '1'), 10) || 1;
      const limit = parseInt(String(req.query['limit'] ?? '20'), 10) || 20;
      const source = req.query['source'] ? String(req.query['source']) : undefined;
      const search = req.query['search'] ? String(req.query['search']) : undefined;
      const startDate = req.query['startDate'] ? String(req.query['startDate']) : undefined;
      const endDate = req.query['endDate'] ? String(req.query['endDate']) : undefined;

      const result = await AnalyticsService.getPageVisits({
        page,
        limit,
        source,
        search,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (user?.email?.toLowerCase() !== 'admin@albunyan.com') {
        throw new ForbiddenError('Only admin@albunyan.com can export page visit analytics');
      }

      const source = req.query['source'] ? String(req.query['source']) : undefined;
      const search = req.query['search'] ? String(req.query['search']) : undefined;
      const startDate = req.query['startDate'] ? String(req.query['startDate']) : undefined;
      const endDate = req.query['endDate'] ? String(req.query['endDate']) : undefined;

      const csvContent = await AnalyticsService.exportCsv({
        source,
        search,
        startDate,
        endDate,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="evolix_visits_${new Date().toISOString().slice(0, 10)}.csv"`);
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  },
};
