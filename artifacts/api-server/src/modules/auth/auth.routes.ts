import { Router } from 'express';
import { authController } from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

/**
 * POST /api/auth/login
 * Public — no token required.
 */
router.post('/login', authController.login.bind(authController));

/**
 * POST /api/auth/logout
 * Protected — requires a valid access token.
 */
router.post('/logout', authenticate, authController.logout.bind(authController));

/**
 * POST /api/auth/refresh
 * Public — accepts a refresh token, returns new token pair.
 */
router.post('/refresh', authController.refresh.bind(authController));

/**
 * GET /api/auth/me
 * Protected — returns the current user's profile.
 */
router.get('/me', authenticate, authController.me.bind(authController));

export default router;
