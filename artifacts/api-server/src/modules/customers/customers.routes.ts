import { Router } from 'express';
import { customersController } from './customers.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasRole, hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', hasMinRole('WAREHOUSE'), customersController.list.bind(customersController));
router.get('/:id', hasMinRole('WAREHOUSE'), customersController.getOne.bind(customersController));
router.post('/', hasRole('OWNER', 'ADMIN', 'MANAGER'), customersController.create.bind(customersController));
router.put('/:id', hasRole('OWNER', 'ADMIN', 'MANAGER'), customersController.update.bind(customersController));
router.delete('/:id', hasRole('OWNER', 'ADMIN'), customersController.remove.bind(customersController));

export default router;
