import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { SalesController } from './sales.controller.js';

const router = Router();

// All sales routes require authentication
router.use(authenticate);

// Statistics — registered BEFORE /:id to prevent route shadowing
router.get('/statistics', hasMinRole('SALES'), SalesController.getStatistics);

// List & single
router.get('/',    hasMinRole('SALES'), SalesController.list);
router.get('/:id', hasMinRole('SALES'), SalesController.getById);
router.get('/:id/history', hasMinRole('SALES'), SalesController.getHistory);

// Create — minimum SALES
router.post('/', hasMinRole('SALES'), SalesController.create);

// Update — minimum SALES
router.put('/:id', hasMinRole('SALES'), SalesController.update);

// Status change — minimum SALES (or MANAGER depending on biz rules, allowing SALES here)
router.patch('/:id/status', hasMinRole('SALES'), SalesController.updateStatus);

// Delete — minimum MANAGER
router.delete('/:id', hasMinRole('MANAGER'), SalesController.delete);

export default router;
