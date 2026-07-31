import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import {
  listQuotationsHandler,
  getQuotationHandler,
  getQuotationStatisticsHandler,
  getQuotationHistoryHandler,
  createQuotationHandler,
  updateQuotationHandler,
  updateQuotationStatusHandler,
  duplicateQuotationHandler,
  convertQuotationHandler,
  deleteQuotationHandler,
  exportQuotationExcelHandler
} from './quotations.controller.js';

const router = Router();

// All quotation routes require authentication
router.use(authenticate);

// ─── GET Routes (Read-Only) — Accessible to WAREHOUSE and above ──────────────
router.get('/', hasMinRole('WAREHOUSE'), listQuotationsHandler);
router.get('/statistics', hasMinRole('WAREHOUSE'), getQuotationStatisticsHandler);
router.get('/:id', hasMinRole('WAREHOUSE'), getQuotationHandler);
router.get('/:id/history', hasMinRole('WAREHOUSE'), getQuotationHistoryHandler);

// ─── Export — Accessible to SALES and above ──────────────────────────────────
router.get('/:id/export-excel', hasMinRole('SALES'), exportQuotationExcelHandler);

// ─── Action Routes — Accessible to SALES and above ───────────────────────────
router.post('/', hasMinRole('SALES'), createQuotationHandler);
router.put('/:id', hasMinRole('SALES'), updateQuotationHandler);
router.patch('/:id/status', hasMinRole('SALES'), updateQuotationStatusHandler);
router.post('/:id/duplicate', hasMinRole('SALES'), duplicateQuotationHandler);
router.post('/:id/convert', hasMinRole('SALES'), convertQuotationHandler);

// ─── DELETE Route — Accessible to MANAGER and above ──────────────────────────
router.delete('/:id', hasMinRole('MANAGER'), deleteQuotationHandler);

export default router;
