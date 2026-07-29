import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { PurchasesController } from './purchases.controller.js';

const router = Router();

// All purchase routes require authentication
router.use(authenticate);

// Statistics — registered BEFORE /:id to prevent route shadowing
router.get('/statistics', hasMinRole('WAREHOUSE'), PurchasesController.getStatistics);

// List & single
router.get('/',    hasMinRole('WAREHOUSE'), PurchasesController.list);
router.get('/:id', hasMinRole('WAREHOUSE'), PurchasesController.getById);
router.get('/:id/history', hasMinRole('WAREHOUSE'), PurchasesController.getHistory);

// Create — minimum MANAGER
router.post('/', hasMinRole('MANAGER'), PurchasesController.create);

// Update — minimum MANAGER
router.put('/:id', hasMinRole('MANAGER'), PurchasesController.update);

// Status change — minimum MANAGER
router.patch('/:id/status', hasMinRole('MANAGER'), PurchasesController.updateStatus);

// Delete — minimum ADMIN
router.delete('/:id', hasMinRole('ADMIN'), PurchasesController.delete);

export default router;
