import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { DeliveryOrdersController } from './delivery-orders.controller.js';

const router = Router();

// All delivery order routes require authentication
router.use(authenticate);

// Static routes BEFORE /:id to prevent route shadowing
router.get('/statistics', hasMinRole('WAREHOUSE'), DeliveryOrdersController.getStatistics);

// List & single
router.get('/',    hasMinRole('WAREHOUSE'), DeliveryOrdersController.list);
router.get('/:id', hasMinRole('WAREHOUSE'), DeliveryOrdersController.getById);

// Create — minimum WAREHOUSE
router.post('/', hasMinRole('WAREHOUSE'), DeliveryOrdersController.create);

// Duplicate — minimum WAREHOUSE
router.post('/:id/duplicate', hasMinRole('WAREHOUSE'), DeliveryOrdersController.duplicate);

// Update — minimum WAREHOUSE (only DRAFT)
router.put('/:id', hasMinRole('WAREHOUSE'), DeliveryOrdersController.update);

// Status change — minimum WAREHOUSE (service enforces further rules)
router.patch('/:id/status', hasMinRole('WAREHOUSE'), DeliveryOrdersController.updateStatus);

// Delete — minimum MANAGER
router.delete('/:id', hasMinRole('MANAGER'), DeliveryOrdersController.delete);

export default router;
