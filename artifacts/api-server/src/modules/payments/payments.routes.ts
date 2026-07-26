import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { hasMinRole } from '../../middlewares/authorize.js';
import { PaymentsController } from './payments.controller.js';

const router = Router();

router.use(authenticate);

// Statistics
router.get('/statistics', hasMinRole('SALES'), PaymentsController.getStatistics);

// Core Payments
router.get('/', hasMinRole('SALES'), PaymentsController.list); // SALES, PURCHASES, FINANCE all have access
router.get('/:id', hasMinRole('SALES'), PaymentsController.getById);
router.post('/', PaymentsController.create);
router.put('/:id/status', hasMinRole('MANAGER'), PaymentsController.updateStatus);
router.delete('/:id', hasMinRole('MANAGER'), PaymentsController.delete);

// Allocations
router.post('/:id/allocations', hasMinRole('MANAGER'), PaymentsController.allocate);
router.delete('/:id/allocations/:allocationId', hasMinRole('MANAGER'), PaymentsController.removeAllocation);

import multer from 'multer';

// Attachments
const upload = multer({ dest: 'uploads/temp/' }); // Temporary folder, will be moved by service
router.post('/:id/attachments', hasMinRole('MANAGER'), upload.single('file'), PaymentsController.uploadAttachment);
router.get('/:id/attachments/:attachmentId/download', hasMinRole('SALES'), PaymentsController.downloadAttachment);
router.get('/:id/attachments/:attachmentId/preview', hasMinRole('SALES'), PaymentsController.previewAttachment);
router.delete('/:id/attachments/:attachmentId', hasMinRole('MANAGER'), PaymentsController.deleteAttachment);

export default router;
