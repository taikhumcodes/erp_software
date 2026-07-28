import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';

function parseDates(query: any) {
  const startDate = query.startDate ? new Date(query.startDate as string) : new Date(new Date().setMonth(new Date().getMonth() - 1));
  const endDate = query.endDate ? new Date(query.endDate as string) : new Date();
  return { startDate, endDate };
}

export async function getKPIsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const kpis = await dashboardService.getKPIs(startDate, endDate);
    res.json(kpis);
  } catch (error) {
    next(error);
  }
}

export async function getInventoryIntelligenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const inventory = await dashboardService.getInventoryIntelligence(startDate, endDate);
    res.json(inventory);
  } catch (error) {
    next(error);
  }
}

export async function getFinancialAnalyticsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const charts = await dashboardService.getFinancialAnalytics(startDate, endDate);
    res.json(charts);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerAnalyticsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const data = await dashboardService.getCustomerAnalytics(startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getSupplierAnalyticsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const data = await dashboardService.getSupplierAnalytics(startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getSalesAnalyticsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const data = await dashboardService.getSalesAnalytics(startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getOperationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const operations = await dashboardService.getOperations(startDate, endDate);
    res.json(operations);
  } catch (error) {
    next(error);
  }
}

export async function getBusinessHealthHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = parseDates(req.query);
    const data = await dashboardService.getBusinessHealth(startDate, endDate);
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function getFinancialCentersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getFinancialCenters();
    res.json(data);
  } catch (error) {
    next(error);
  }
}
