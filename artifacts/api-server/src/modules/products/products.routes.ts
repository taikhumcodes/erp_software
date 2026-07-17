import { Router } from 'express';
import { productsController } from './products.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasRole, hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

router.use(authenticate);

// Read — Sales and Warehouse can view products
router.get('/', hasMinRole('WAREHOUSE'), productsController.list.bind(productsController));
router.get('/:id', hasMinRole('WAREHOUSE'), productsController.getOne.bind(productsController));

// Write — Manager and above can create/edit
router.post('/', hasRole('OWNER', 'ADMIN', 'MANAGER'), productsController.create.bind(productsController));
router.put('/:id', hasRole('OWNER', 'ADMIN', 'MANAGER'), productsController.update.bind(productsController));

// Delete — Admin and above
router.delete('/:id', hasRole('OWNER', 'ADMIN'), productsController.remove.bind(productsController));

export default router;
