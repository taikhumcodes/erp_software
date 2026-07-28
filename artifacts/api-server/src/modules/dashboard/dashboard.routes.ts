import { Router } from 'express';
import {
  getKPIsHandler,
  getInventoryIntelligenceHandler,
  getFinancialAnalyticsHandler,
  getCustomerAnalyticsHandler,
  getSupplierAnalyticsHandler,
  getSalesAnalyticsHandler,
  getOperationsHandler,
  getBusinessHealthHandler,
  getFinancialCentersHandler
} from './dashboard.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/kpis', getKPIsHandler);
router.get('/inventory', getInventoryIntelligenceHandler);
router.get('/financial', getFinancialAnalyticsHandler);
router.get('/customers', getCustomerAnalyticsHandler);
router.get('/suppliers', getSupplierAnalyticsHandler);
router.get('/sales', getSalesAnalyticsHandler);
router.get('/operations', getOperationsHandler);
router.get('/health', getBusinessHealthHandler);
router.get('/centers', getFinancialCentersHandler);

export default router;
