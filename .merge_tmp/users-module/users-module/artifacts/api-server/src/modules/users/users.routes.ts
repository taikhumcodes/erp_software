import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { UsersController } from './users.controller.js';

const router = Router();

// All user-management routes require authentication
router.use(authenticate);

// Statistics — registered BEFORE /:id to prevent route shadowing
router.get('/statistics', hasMinRole('MANAGER'), UsersController.getStatistics);

// List & single — any authenticated user can read (WAREHOUSE+)
router.get('/',     hasMinRole('WAREHOUSE'), UsersController.list);
router.get('/:id',  hasMinRole('WAREHOUSE'), UsersController.getById);

// Create — MANAGER and above (role hierarchy enforced in service)
router.post('/', hasMinRole('MANAGER'), UsersController.create);

// Update profile — MANAGER and above
router.put('/:id', hasMinRole('MANAGER'), UsersController.update);

// Toggle status — MANAGER and above
router.patch('/:id/status', hasMinRole('MANAGER'), UsersController.updateStatus);

// Reset password — MANAGER and above (self-reset allowed regardless of route guard)
router.patch('/:id/password', hasMinRole('MANAGER'), UsersController.resetPassword);

// Delete — ADMIN and above
router.delete('/:id', hasMinRole('ADMIN'), UsersController.delete);

export default router;
