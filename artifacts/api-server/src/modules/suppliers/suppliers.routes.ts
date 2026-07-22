import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { SuppliersController } from './suppliers.controller.js';

const router = Router();

// All supplier routes require authentication
router.use(authenticate);

// Statistics — registered BEFORE /:id to prevent route shadowing
router.get('/statistics', hasMinRole('WAREHOUSE'), SuppliersController.getStatistics);

// List & single
router.get('/',    hasMinRole('WAREHOUSE'), SuppliersController.list);
router.get('/:id', hasMinRole('WAREHOUSE'), SuppliersController.getById);

// Create / update — minimum MANAGER
router.post('/',    hasMinRole('MANAGER'), SuppliersController.create);
router.put('/:id',  hasMinRole('MANAGER'), SuppliersController.update);

// Delete — minimum ADMIN
router.delete('/:id', hasMinRole('ADMIN'), SuppliersController.delete);

export default router;
