import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { developerController } from './developer.controller.js';

const router = Router();

// All developer routes require authentication and are strictly limited to admin@albunyan.com
router.use(authenticate);

// Session monitoring & termination
router.get('/sessions', (req, res, next) => developerController.listSessions(req, res, next));
router.post('/sessions/:id/terminate', (req, res, next) => developerController.terminateSession(req, res, next));
router.post('/users/:userId/terminate-sessions', (req, res, next) => developerController.terminateAllUserSessions(req, res, next));

// Demo accounts management
router.get('/demo-users', (req, res, next) => developerController.listDemoUsers(req, res, next));
router.post('/demo-users', (req, res, next) => developerController.createDemoUser(req, res, next));
router.post('/demo-users/:id/toggle', (req, res, next) => developerController.toggleDemoUser(req, res, next));
router.post('/demo-users/:id/extend', (req, res, next) => developerController.extendDemoUser(req, res, next));

// Demo environment sandbox data reset
router.post('/demo-data/reset', (req, res, next) => developerController.resetDemoData(req, res, next));

export default router;
