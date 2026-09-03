import { Router } from 'express';
import { ReportsController } from './reports.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);

// Overview hub & catalog
router.get('/hub', ReportsController.getHubOverview);
router.get('/catalog', ReportsController.getCatalog);

// Standard & Custom Report Run
router.get('/run/:reportId', ReportsController.runReport);
router.post('/custom/run', ReportsController.runCustomReport);

// Exports
router.get('/export/:reportId', ReportsController.exportReport);

// Saved Custom Reports
router.get('/saved', ReportsController.getSavedReports);
router.post('/saved', ReportsController.createSavedReport);
router.delete('/saved/:id', ReportsController.deleteSavedReport);

export default router;
