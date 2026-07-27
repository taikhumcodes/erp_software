import { Router } from 'express';
import {
  getKPIsHandler,
  getInventoryIntelligenceHandler,
  getChartsHandler,
  getOperationsHandler
} from './dashboard.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/kpis', getKPIsHandler);
router.get('/inventory', getInventoryIntelligenceHandler);
router.get('/charts', getChartsHandler);
router.get('/operations', getOperationsHandler);

export default router;
