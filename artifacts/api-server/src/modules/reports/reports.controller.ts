import { Request, Response } from 'express';
import { ReportsService, ReportFilterParams } from './reports.service.js';
import { DATA_SOURCES, STANDARD_REPORTS_METADATA } from './reports.registry.js';
import { generateCsv, generateExcelXml } from './reports.export.js';

export const ReportsController = {
  async getHubOverview(req: Request, res: Response) {
    try {
      const data = await ReportsService.getHubOverview();
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('ReportsController.getHubOverview error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async getCatalog(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const role = user?.role || 'SALES';

      // Filter standard reports based on user role
      const reports = STANDARD_REPORTS_METADATA.filter(r => {
        if (role === 'OWNER' || role === 'ADMIN') return true;
        return r.requiredRoles.includes(role);
      });

      // Filter data sources for custom builder
      const sources = Object.values(DATA_SOURCES).filter(ds => {
        if (role === 'OWNER' || role === 'ADMIN') return true;
        return ds.requiredRoles.includes(role);
      });

      return res.json({
        success: true,
        data: {
          reports,
          dataSources: sources,
        },
      });
    } catch (err: any) {
      console.error('ReportsController.getCatalog error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async runReport(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const user = (req as any).user;
      const role = user?.role || 'SALES';
      const reportId = String(req.params.reportId);

      const meta = STANDARD_REPORTS_METADATA.find(r => r.id === reportId);
      if (!meta) {
        return res.status(404).json({ success: false, error: `Report '${reportId}' not found` });
      }

      // Check RBAC permissions
      if (role !== 'OWNER' && role !== 'ADMIN' && !meta.requiredRoles.includes(role)) {
        return res.status(403).json({ success: false, error: 'You do not have permission to run this report' });
      }

      const params: ReportFilterParams = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        customerId: req.query.customerId as string,
        supplierId: req.query.supplierId as string,
        productId: req.query.productId as string,
        categoryId: req.query.categoryId as string,
        status: req.query.status as string,
        search: req.query.search as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
      };

      const result = await ReportsService.runStandardReport(reportId, params);

      // Asynchronously log audit execution
      const durationMs = Date.now() - startTime;
      ReportsService.logExecution({
        reportType: reportId,
        reportName: meta.nameEn,
        userId: user?.id || 'unknown',
        filters: params,
        durationMs,
        rowCount: result.rows.length,
        format: 'VIEW',
      }).catch(e => console.error('Failed to log report execution:', e));

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('ReportsController.runReport error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async runCustomReport(req: Request, res: Response) {
    const startTime = Date.now();
    try {
      const user = (req as any).user;
      const result = await ReportsService.runCustomReport(req.body);

      const durationMs = Date.now() - startTime;
      ReportsService.logExecution({
        reportType: 'CUSTOM',
        reportName: `Custom: ${req.body.dataSource}`,
        userId: user?.id || 'unknown',
        filters: req.body,
        durationMs,
        rowCount: result.rows.length,
        format: 'VIEW',
      }).catch(e => console.error('Failed to log custom report execution:', e));

      return res.json({ success: true, data: result });
    } catch (err: any) {
      console.error('ReportsController.runCustomReport error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async exportReport(req: Request, res: Response) {
    try {
      const reportId = String(req.params.reportId);
      const format = (req.query.format as string || 'csv').toLowerCase();

      const params: ReportFilterParams = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        customerId: req.query.customerId as string,
        supplierId: req.query.supplierId as string,
        page: 1,
        limit: 10000, // Export full filtered dataset
      };

      const result = await ReportsService.runStandardReport(reportId, params);
      const filename = `${reportId}_${new Date().toISOString().slice(0, 10)}`;

      if (format === 'excel' || format === 'xlsx') {
        const xml = generateExcelXml(result.metadata.nameEn, result.columns, result.rows, result.totals);
        res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.xls"`);
        return res.send(xml);
      } else {
        const csv = generateCsv(result.columns, result.rows);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        return res.send(csv);
      }
    } catch (err: any) {
      console.error('ReportsController.exportReport error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async getSavedReports(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await ReportsService.getSavedReports(user?.id);
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error('ReportsController.getSavedReports error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async createSavedReport(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const data = await ReportsService.createSavedReport(user?.id, req.body);
      return res.status(201).json({ success: true, data });
    } catch (err: any) {
      console.error('ReportsController.createSavedReport error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  async deleteSavedReport(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const id = String(req.params.id);
      const isSuperAdmin = user?.role === 'OWNER' || user?.email === 'admin@albunyan.com';
      await ReportsService.deleteSavedReport(id, user?.id, isSuperAdmin);
      return res.json({ success: true, message: 'Saved report deleted' });
    } catch (err: any) {
      console.error('ReportsController.deleteSavedReport error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
