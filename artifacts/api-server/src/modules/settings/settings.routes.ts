/**
 * Settings Routes
 *
 * REST endpoints for the Settings module.
 * All write operations require ADMIN or OWNER role.
 * Read operations require authentication.
 */
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { settingsController } from './settings.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';

const router = Router();

// ── Logo upload configuration ─────────────────────────────────────────────────
const uploadsDir = path.resolve('uploads/company');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPEG, SVG, and WebP images are allowed'));
    }
  },
});

// ── Export / Import (must be before :namespace param routes) ───────────────────

router.get(
  '/export',
  authenticate,
  hasMinRole('ADMIN'),
  settingsController.exportAll.bind(settingsController),
);

router.post(
  '/import',
  authenticate,
  hasMinRole('ADMIN'),
  settingsController.importAll.bind(settingsController),
);

// ── Reset ─────────────────────────────────────────────────────────────────────

router.post(
  '/reset',
  authenticate,
  hasMinRole('ADMIN'),
  settingsController.reset.bind(settingsController),
);

// ── Logo Upload ───────────────────────────────────────────────────────────────

router.post(
  '/upload/logo',
  authenticate,
  hasMinRole('ADMIN'),
  logoUpload.single('logo'),
  settingsController.uploadLogo.bind(settingsController),
);

// ── Namespace-level ───────────────────────────────────────────────────────────

router.get(
  '/:namespace',
  authenticate,
  settingsController.getByNamespace.bind(settingsController),
);

// ── Setting-level ─────────────────────────────────────────────────────────────

router.get(
  '/:namespace/:key',
  authenticate,
  settingsController.getSetting.bind(settingsController),
);

router.put(
  '/:namespace/:key',
  authenticate,
  hasMinRole('ADMIN'),
  settingsController.upsertSetting.bind(settingsController),
);

// ── History ───────────────────────────────────────────────────────────────────

router.get(
  '/:namespace/:key/history',
  authenticate,
  settingsController.getHistory.bind(settingsController),
);

export default router;
