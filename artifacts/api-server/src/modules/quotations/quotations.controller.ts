import type { Request, Response, NextFunction } from 'express';
import { QuotationsService } from './quotations.service.js';
import type { QuotationFilters } from './quotations.repository.js';
import { QuotationStatus } from '@prisma/client';
import * as XLSX from 'xlsx';

export async function listQuotationsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: QuotationFilters = {
      search: req.query.search as string,
      status: req.query.status as QuotationStatus,
      customerId: req.query.customerId as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    };
    const result = await QuotationsService.list(filters);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quotation = await QuotationsService.getById(id as string);
    res.json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function getQuotationStatisticsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await QuotationsService.getStatistics();
    res.json(stats);
  } catch (error) {
    next(error);
  }
}

export async function getQuotationHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const history = await QuotationsService.getHistory(id as string);
    res.json(history);
  } catch (error) {
    next(error);
  }
}

export async function createQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const quotation = await QuotationsService.create(userId, req.body);
    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function updateQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const quotation = await QuotationsService.update(id as string, userId, req.body);
    res.json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function updateQuotationStatusHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const quotation = await QuotationsService.updateStatus(id as string, userId, req.body);
    res.json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function duplicateQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const quotation = await QuotationsService.duplicate(id as string, userId);
    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function convertQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const quotation = await QuotationsService.convert(id as string, userId, req.body);
    res.json(quotation);
  } catch (error) {
    next(error);
  }
}

export async function deleteQuotationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;
    await QuotationsService.delete(id as string, userId, role);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

// ─── Phase 6: Excel Export ────────────────────────────────────────────────────

export async function exportQuotationExcelHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const quotation = await QuotationsService.getById(id as string);

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Quotation Number', quotation.number],
      ['Date', quotation.quotationDate],
      ['Validity Date', quotation.validityDate || 'N/A'],
      ['Status', quotation.status],
      ['Customer Name', quotation.customer?.name || (quotation as any).customerName],
      ['Customer Code', quotation.customer?.code || 'Ad-Hoc'],
      ['Contact Person', quotation.contactPerson || 'N/A'],
      ['Reference', quotation.referenceNumber || 'N/A'],
      ['Customer Reference', quotation.customerReference || 'N/A'],
      ['Total Amount (KWD)', quotation.totalAmount],
      ['Discount (KWD)', quotation.discount],
      ['Round Off (KWD)', quotation.roundOff],
      ['Grand Total (KWD)', quotation.grandTotal],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Items Sheet
    const itemsData = quotation.items.map((item, idx) => ({
      '#': idx + 1,
      'Product SKU': item.product.sku,
      'Product Name': item.product.name,
      'Description': item.description || '',
      'Country of Origin': item.countryOfOrigin || '',
      'Unit': item.product.unit.abbreviation,
      'Quantity': item.quantity,
      'Unit Price (KWD)': item.unitPrice,
      'Total Amount (KWD)': item.amount,
    }));
    const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');

    // Write buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Quotation_${quotation.number}.xlsx`);
    res.send(buffer);

    await QuotationsService.logAction(quotation.id, 'DOWNLOAD', req.user!.id, 'Exported to Excel');
  } catch (error) {
    next(error);
  }
}
