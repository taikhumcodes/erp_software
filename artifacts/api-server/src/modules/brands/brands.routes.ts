import { Router } from 'express';
import { brandsController } from './brands.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasRole, hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', hasMinRole('WAREHOUSE'), brandsController.list.bind(brandsController));
router.get('/:id', hasMinRole('WAREHOUSE'), brandsController.getOne.bind(brandsController));
router.post('/', hasRole('OWNER', 'ADMIN', 'MANAGER'), brandsController.create.bind(brandsController));
router.put('/:id', hasRole('OWNER', 'ADMIN', 'MANAGER'), brandsController.update.bind(brandsController));
router.delete('/:id', hasRole('OWNER', 'ADMIN'), brandsController.remove.bind(brandsController));

export default router;
