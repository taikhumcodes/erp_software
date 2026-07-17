import { Router } from 'express';
import { categoriesController } from './categories.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasRole, hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/categories — all authenticated users can read
router.get('/', hasMinRole('WAREHOUSE'), categoriesController.list.bind(categoriesController));

// GET /api/categories/:id
router.get('/:id', hasMinRole('WAREHOUSE'), categoriesController.getOne.bind(categoriesController));

// POST /api/categories — Manager and above
router.post('/', hasRole('OWNER', 'ADMIN', 'MANAGER'), categoriesController.create.bind(categoriesController));

// PUT /api/categories/:id — Manager and above
router.put('/:id', hasRole('OWNER', 'ADMIN', 'MANAGER'), categoriesController.update.bind(categoriesController));

// DELETE /api/categories/:id — Admin and above only
router.delete('/:id', hasRole('OWNER', 'ADMIN'), categoriesController.remove.bind(categoriesController));

export default router;
