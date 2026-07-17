import { Router } from 'express';
import { unitsController } from './units.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasRole, hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

router.use(authenticate);

router.get('/', hasMinRole('WAREHOUSE'), unitsController.list.bind(unitsController));
router.get('/:id', hasMinRole('WAREHOUSE'), unitsController.getOne.bind(unitsController));
router.post('/', hasRole('OWNER', 'ADMIN', 'MANAGER'), unitsController.create.bind(unitsController));
router.put('/:id', hasRole('OWNER', 'ADMIN', 'MANAGER'), unitsController.update.bind(unitsController));
router.delete('/:id', hasRole('OWNER', 'ADMIN'), unitsController.remove.bind(unitsController));

export default router;
