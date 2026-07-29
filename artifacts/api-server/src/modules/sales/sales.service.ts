import { SaleStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { SalesRepository, type SaleFilters } from './sales.repository.js';
import { SalesFinancialService } from './sales-financial.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';

// ─── Valid status transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  DRAFT:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['CANCELLED'],
  CANCELLED: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDecimal(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') {
    return '0.000';
  }
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  return parsed.toFixed(3);
}

function parsePositiveDecimal(value: unknown, fieldName: string): string {
  const result = parseDecimal(value, fieldName);
  if (parseFloat(result) < 0) {
    throw new ValidationError(`${fieldName} must not be negative`);
  }
  return result;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SalesService = {
  async list(filters: SaleFilters) {
    return SalesRepository.findAll(filters);
  },

  async getById(id: string) {
    const sale = await SalesRepository.findById(id);
    if (!sale) throw new NotFoundError('Sale');
    return sale;
  },

  async getStatistics() {
    const [total, draft, confirmed, delivered, cancelled, amountAgg] = await Promise.all([
      prisma.sale.count(),
      prisma.sale.count({ where: { status: 'DRAFT' } }),
      prisma.sale.count({ where: { status: 'CONFIRMED' } }),
      prisma.sale.count({ where: { status: 'DELIVERED' } }),
      prisma.sale.count({ where: { status: 'CANCELLED' } }),
      prisma.sale.aggregate({
        _sum: { netAmount: true },
        where: { status: 'DELIVERED' },
      }),
    ]);

    return {
      total,
      draft,
      confirmed,
      delivered,
      cancelled,
      totalAmount: amountAgg._sum.netAmount?.toFixed(3) ?? '0.000',
    };
  },

  async getHistory(id: string) {
    return prisma.saleHistory.findMany({
      where: { saleId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
  },

  async create(userId: string, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    const deliveryOrderId = normalise(body['deliveryOrderId']);
    let doRef: any = null;

    if (deliveryOrderId) {
      doRef = await prisma.deliveryOrder.findUnique({
        where: { id: deliveryOrderId },
        include: { items: true },
      });
      if (!doRef) {
        throw new ValidationError('Delivery Order not found');
      }
      if (doRef.invoiceStatus !== 'NOT_INVOICED') {
        throw new ConflictError('Delivery Order is already invoiced');
      }
    }

    // ── Validate customer ─────────────────────────────────────────────────
    const customerId = doRef ? doRef.customerId : normalise(body['customerId']);
    if (!customerId) {
      fieldErrors.push({ field: 'customerId', message: 'Customer is required' });
    } else if (!doRef) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        fieldErrors.push({ field: 'customerId', message: 'Customer not found' });
      } else if (!customer.isActive) {
        fieldErrors.push({ field: 'customerId', message: 'Customer is inactive' });
      }
    }

    // ── Validate sale date ────────────────────────────────────────────
    let saleDate = new Date();
    const rawDate = body['saleDate'];
    if (rawDate) {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'saleDate', message: 'Invalid sale date' });
      } else {
        saleDate = parsed;
      }
    }

    const rawStatus = normalise(body['status']);
    const status: SaleStatus = (rawStatus === 'DRAFT' || rawStatus === 'CONFIRMED') ? rawStatus : 'DRAFT';

    // ── Validate items ────────────────────────────────────────────────────
    const rawItems = body['items'];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      fieldErrors.push({ field: 'items', message: 'At least one item is required' });
    }

    let headerDiscount = '0.000';
    try {
      headerDiscount = parsePositiveDecimal(body['discount'], 'Discount');
    } catch {
      fieldErrors.push({ field: 'discount', message: 'Discount must be a non-negative number' });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    let calculatedTotal = 0;
    const validatedItems: { productId: string; quantity: string; unitPrice: string; total: string }[] = [];
    const productIds = new Set<string>();
    const itemsArr = rawItems as unknown[];

    for (let i = 0; i < itemsArr.length; i++) {
      const row = itemsArr[i] as Record<string, unknown>;
      const productId = normalise(row['productId']);
      if (!productId) {
        fieldErrors.push({ field: `items[${i}].productId`, message: 'Product is required' });
        continue;
      }

      if (productIds.has(productId)) {
        fieldErrors.push({ field: `items[${i}].productId`, message: 'Duplicate product in sale' });
        continue;
      }
      productIds.add(productId);

      try {
        const qty = parsePositiveDecimal(row['quantity'], 'Quantity');
        const price = parsePositiveDecimal(row['unitPrice'], 'Unit Price');

        if (parseFloat(qty) === 0) {
          fieldErrors.push({ field: `items[${i}].quantity`, message: 'Quantity must be greater than zero' });
        }

        const lineTotal = parseFloat(qty) * parseFloat(price);
        calculatedTotal += lineTotal;

        validatedItems.push({
          productId,
          quantity: qty,
          unitPrice: price,
          total: lineTotal.toFixed(3),
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          fieldErrors.push({ field: `items[${i}]`, message: err.message });
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // Only validate stock for Direct Invoices (when deliveryOrderId is null)
    if (!deliveryOrderId) {
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: { id: true, name: true, isActive: true, stockQuantity: true },
      });

      for (const pid of productIds) {
        const p = dbProducts.find((x) => x.id === pid);
        if (!p) {
          fieldErrors.push({ field: 'items', message: `Product ${pid} not found` });
        } else if (!p.isActive) {
          fieldErrors.push({ field: 'items', message: `Product "${p.name}" is inactive` });
        } else {
          const reqQty = validatedItems.find(v => v.productId === pid)?.quantity || '0';
          if (Number(p.stockQuantity) < Number(reqQty)) {
            fieldErrors.push({ field: 'items', message: `Insufficient stock for "${p.name}". Available: ${p.stockQuantity}` });
          }
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const netAmount = calculatedTotal - parseFloat(headerDiscount);
    if (netAmount < 0) {
      throw new ValidationError('Discount cannot exceed total amount');
    }

    return prisma.$transaction(async (tx) => {
      const number = await DocumentNumberService.generateInvoiceNumber(tx);
      const internalSONumber = deliveryOrderId ? doRef.internalSONumber : await DocumentNumberService.generateInternalSONumber(tx);
      
      const newSale = await SalesRepository.create(tx, {
        number,
        internalSONumber,
        customerPONumber: doRef ? doRef.customerPONumber : normalise(body['customerPONumber']),
        deliveryOrderId: deliveryOrderId || null,
        orderSource: deliveryOrderId ? doRef.orderType : 'DIRECT', // Inherit from DO if present
        customerId: customerId!,
        userId,
        status: status,
        saleDate,
        totalAmount: calculatedTotal.toFixed(3),
        discount: headerDiscount,
        netAmount: netAmount.toFixed(3),
        notes: normalise(body['notes']),
        paymentMethod: body['paymentMethod'] as any || null,
        items: validatedItems,
      });

      if (deliveryOrderId) {
        await tx.deliveryOrder.update({
          where: { id: deliveryOrderId },
          data: { invoiceStatus: 'INVOICED' },
        });
      }

      // If created as CONFIRMED directly and it's a DIRECT invoice, deduct stock
      if (status === 'CONFIRMED' && !deliveryOrderId) {
        const itemsDelta = validatedItems.map(item => ({
          productId: item.productId,
          quantity: `-${item.quantity}`,
        }));
        await InventoryService.adjustStockBatch(tx, itemsDelta);
      }

      await tx.saleHistory.create({
        data: {
          saleId: newSale.id,
          toStatus: status,
          userId,
          notes: 'Sale created'
        }
      });

      return newSale;
    });
  },

  async update(id: string, userId: string, body: Record<string, unknown>) {
    const existing = await SalesRepository.findById(id);
    if (!existing) throw new NotFoundError('Sale');

    if (existing.status !== 'DRAFT' && existing.status !== 'CONFIRMED') {
      throw new ConflictError('Only DRAFT or CONFIRMED sales can be edited');
    }

    const fieldErrors: { field: string; message: string }[] = [];

    // If it's a DO invoice, customer cannot be changed.
    let customerId = existing.customerId;
    if (!existing.deliveryOrderId && body['customerId'] !== undefined) {
      customerId = normalise(body['customerId']) ?? existing.customerId;
      if (customerId !== existing.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          fieldErrors.push({ field: 'customerId', message: 'Customer not found' });
        } else if (!customer.isActive) {
          fieldErrors.push({ field: 'customerId', message: 'Customer is inactive' });
        }
      }
    }

    let saleDate = existing.saleDate;
    const rawDate = body['saleDate'];
    if (rawDate) {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'saleDate', message: 'Invalid sale date' });
      } else {
        saleDate = parsed;
      }
    }

    let headerDiscount = existing.discount;
    if (body['discount'] !== undefined) {
      try {
        headerDiscount = parsePositiveDecimal(body['discount'], 'Discount');
      } catch {
        fieldErrors.push({ field: 'discount', message: 'Discount must be a non-negative number' });
      }
    }

    const rawItems = body['items'];
    if (rawItems !== undefined && (!Array.isArray(rawItems) || rawItems.length === 0)) {
      fieldErrors.push({ field: 'items', message: 'At least one item is required' });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    let validatedItems: { productId: string; quantity: string; unitPrice: string; total: string }[] | undefined;
    let calculatedTotal = parseFloat(existing.totalAmount);

    if (rawItems !== undefined) {
      calculatedTotal = 0;
      validatedItems = [];
      const productIds = new Set<string>();

      const itemsArr = rawItems as unknown[];
      for (let i = 0; i < itemsArr.length; i++) {
        const row = itemsArr[i] as Record<string, unknown>;
        const productId = normalise(row['productId']);
        if (!productId) {
          fieldErrors.push({ field: `items[${i}].productId`, message: 'Product is required' });
          continue;
        }

        if (productIds.has(productId)) {
          fieldErrors.push({ field: `items[${i}].productId`, message: 'Duplicate product in sale' });
          continue;
        }
        productIds.add(productId);

        try {
          const qty = parsePositiveDecimal(row['quantity'], 'Quantity');
          const price = parsePositiveDecimal(row['unitPrice'], 'Unit Price');

          if (parseFloat(qty) === 0) {
            fieldErrors.push({ field: `items[${i}].quantity`, message: 'Quantity must be greater than zero' });
          }

          const lineTotal = parseFloat(qty) * parseFloat(price);
          calculatedTotal += lineTotal;

          validatedItems.push({
            productId,
            quantity: qty,
            unitPrice: price,
            total: lineTotal.toFixed(3),
          });
        } catch (err) {
          if (err instanceof ValidationError) {
            fieldErrors.push({ field: `items[${i}]`, message: err.message });
          }
        }
      }

      if (!existing.deliveryOrderId) {
        const dbProducts = await prisma.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, name: true, isActive: true, stockQuantity: true },
        });

        for (const pid of productIds) {
          const p = dbProducts.find((x) => x.id === pid);
          if (!p) {
            fieldErrors.push({ field: 'items', message: `Product ${pid} not found` });
          } else if (!p.isActive) {
            fieldErrors.push({ field: 'items', message: `Product "${p.name}" is inactive` });
          } else {
            const reqQty = validatedItems!.find(v => v.productId === pid)?.quantity || '0';
            if (Number(p.stockQuantity) < Number(reqQty)) {
              fieldErrors.push({ field: 'items', message: `Insufficient stock for "${p.name}". Available: ${p.stockQuantity}` });
            }
          }
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const netAmount = calculatedTotal - parseFloat(headerDiscount);
    if (netAmount < 0) {
      throw new ValidationError('Discount cannot exceed total amount');
    }

    return prisma.$transaction(async (tx) => {
      if (existing.status === 'CONFIRMED' && !existing.deliveryOrderId && validatedItems) {
        const oldQtyMap = new Map<string, number>();
        for (const oldItem of existing.items) {
          const prev = oldQtyMap.get(oldItem.productId) ?? 0;
          oldQtyMap.set(oldItem.productId, prev + parseFloat(oldItem.quantity));
        }

        const newQtyMap = new Map<string, number>();
        for (const newItem of validatedItems) {
          const prev = newQtyMap.get(newItem.productId) ?? 0;
          newQtyMap.set(newItem.productId, prev + parseFloat(newItem.quantity));
        }

        const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
        const itemsDelta: { productId: string; quantity: string }[] = [];
        
        for (const productId of allProductIds) {
          const oldQty = oldQtyMap.get(productId) ?? 0;
          const newQty = newQtyMap.get(productId) ?? 0;
          const diff = oldQty - newQty; 

          if (diff !== 0) {
            itemsDelta.push({ productId, quantity: diff.toFixed(3) });
          }
        }
        
        if (itemsDelta.length > 0) {
          try {
            await InventoryService.adjustStockBatch(tx, itemsDelta);
          } catch (err: any) {
            throw new ValidationError(err.message);
          }
        }
      }

      let historyNotes = 'Sale updated.';
      if (Number(existing.netAmount) !== Number(netAmount.toFixed(3))) {
        historyNotes += ` Amount changed from ${existing.netAmount} to ${netAmount.toFixed(3)}.`;
      }
      if (validatedItems && validatedItems.length !== existing.items.length) {
        historyNotes += ` Items count changed from ${existing.items.length} to ${validatedItems.length}.`;
      }

      await tx.saleHistory.create({
        data: {
          saleId: id,
          fromStatus: existing.status,
          toStatus: existing.status,
          userId,
          notes: historyNotes,
        }
      });

      return SalesRepository.update(tx, id, {
        customerId: customerId !== existing.customerId ? customerId : undefined,
        saleDate,
        totalAmount: calculatedTotal.toFixed(3),
        discount: headerDiscount,
        netAmount: netAmount.toFixed(3),
        notes: body['notes'] !== undefined ? normalise(body['notes']) : undefined,
        items: validatedItems,
      });
    });
  },

  async updateStatus(id: string, userId: string, body: Record<string, unknown>) {
    const existing = await SalesRepository.findById(id);
    if (!existing) throw new NotFoundError('Sale');

    const rawStatus = normalise(body['status']);
    if (!rawStatus) {
      throw new ValidationError('Status is required');
    }

    const newStatus = rawStatus as SaleStatus;
    const oldStatus = existing.status;

    if (newStatus === oldStatus) {
      return existing; // No-op
    }

    const validNext = VALID_TRANSITIONS[oldStatus] ?? [];
    if (!validNext.includes(newStatus)) {
      throw new ConflictError(`Cannot transition sale from ${oldStatus} to ${newStatus}`);
    }

    const isCashSale = body['isCashSale'] === true; // Optional param from frontend when confirming
    const amountPaid = body['amountPaid'] as number | undefined;

    return prisma.$transaction(async (tx) => {
      
      // Stock management ONLY for Direct Invoices (where deliveryOrderId is null)
      if (!existing.deliveryOrderId) {
        // Transitioning to CONFIRMED: Stock DECREASES
        if (newStatus === 'CONFIRMED' && oldStatus === 'DRAFT') {
          const itemsDelta = existing.items.map(item => ({
            productId: item.productId,
            // Negative quantity to decrease stock
            quantity: `-${item.quantity}`,
          }));
          try {
            await InventoryService.adjustStockBatch(tx, itemsDelta);
          } catch (err: any) {
            throw new ValidationError(err.message);
          }
        }
        
        // Cancelling a CONFIRMED or DELIVERED sale: Stock INCREASES
        if (newStatus === 'CANCELLED' && (oldStatus === 'CONFIRMED' || oldStatus === 'DELIVERED')) {
          const itemsDelta = existing.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          }));
          try {
            await InventoryService.adjustStockBatch(tx, itemsDelta);
          } catch (err: any) {
            throw new ValidationError(err.message);
          }
        }
      }

      // Financials (AR/GL posting occurs on DELIVERED)
      if (newStatus === 'DELIVERED') {
        await SalesFinancialService.postSale(tx, id, existing.netAmount, isCashSale, userId);
      }
      if (newStatus === 'CANCELLED' && oldStatus === 'DELIVERED') {
        await SalesFinancialService.reverseSale(tx, id);
      }
      
      // Handle DO Invoice Status on CANCELLED
      if (newStatus === 'CANCELLED' && existing.deliveryOrderId) {
        await tx.deliveryOrder.update({
          where: { id: existing.deliveryOrderId },
          data: { invoiceStatus: 'NOT_INVOICED' },
        });
      }

      await tx.saleHistory.create({
        data: {
          saleId: id,
          fromStatus: existing.status,
          toStatus: newStatus,
          userId,
          notes: `Status changed to ${newStatus}`
        }
      });

      return SalesRepository.updateStatus(tx, id, newStatus);
    });
  },

  async delete(id: string, role?: string) {
    const existing = await SalesRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Sale');
    }
    
    if (existing.status !== 'DRAFT') {
      if (existing.status === 'CANCELLED' && role === 'OWNER') {
        // Allow owner to delete cancelled sales
      } else {
        throw new ConflictError('Only DRAFT sales can be deleted, or CANCELLED sales by OWNER');
      }
    }

    return prisma.$transaction(async (tx) => {
      if (existing.deliveryOrderId) {
        await tx.deliveryOrder.update({
          where: { id: existing.deliveryOrderId },
          data: { invoiceStatus: 'NOT_INVOICED' },
        });
      }
      await SalesRepository.delete(tx, id);
    });
  },
};
