import { Router } from 'express';
import { AnalyticsController } from './analytics.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

// Public click tracking endpoint (accessible from sidebar or login page)
router.post('/track', AnalyticsController.trackClick);

// Protected endpoints for admin@albunyan.com only
router.get('/page-visits', authenticate, AnalyticsController.getPageVisits);
router.get('/page-visits/export', authenticate, AnalyticsController.exportCsv);

export default router;
