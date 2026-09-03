import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { backupController } from './backup.controller.js';

const router = Router();

// All backup routes require valid JWT authentication
router.use(authenticate);

// Backup routes — restricted to admin@albunyan.com inside controller
router.get('/stats', (req, res, next) => backupController.getStats(req, res, next));
router.get('/export', (req, res, next) => backupController.exportBackup(req, res, next));
router.post('/import', (req, res, next) => backupController.importBackup(req, res, next));

export default router;
