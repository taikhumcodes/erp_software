import { PurchaseStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { PurchasesRepository, type PurchaseFilters } from './purchases.repository.js';
import { PurchaseFinancialService } from './purchase-financial.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';

// ─── Valid status transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<PurchaseStatus, PurchaseStatus[]> = {
  DRAFT:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['RECEIVED', 'CANCELLED'],
  RECEIVED:  ['CANCELLED'],
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

export const PurchasesService = {
  async list(filters: PurchaseFilters) {
    return PurchasesRepository.findAll(filters);
  },

  async getById(id: string) {
    const purchase = await PurchasesRepository.findById(id);
    if (!purchase) throw new NotFoundError('Purchase');
    return purchase;
  },

  async getStatistics() {
    return PurchasesRepository.getStatistics();
  },

  async getHistory(id: string) {
    return prisma.purchaseHistory.findMany({
      where: { purchaseId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    });
  },

  async create(userId: string, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Validate supplier ─────────────────────────────────────────────────
    const supplierId = normalise(body['supplierId']);
    if (!supplierId) {
      fieldErrors.push({ field: 'supplierId', message: 'Supplier is required' });
    }

    // ── Validate purchase date ────────────────────────────────────────────
    let purchaseDate = new Date();
    const rawDate = body['purchaseDate'];
    if (rawDate) {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'purchaseDate', message: 'Invalid purchase date' });
      } else {
        purchaseDate = parsed;
      }
    }

    // ── Validate status ───────────────────────────────────────────────────
    const rawStatus = normalise(body['status']);
    const status: PurchaseStatus = (rawStatus === 'DRAFT' || rawStatus === 'CONFIRMED')
      ? rawStatus
      : 'DRAFT';

    // ── Validate items ────────────────────────────────────────────────────
    const rawItems = body['items'];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      fieldErrors.push({ field: 'items', message: 'At least one item is required' });
    }

    // ── Header discount ───────────────────────────────────────────────────
    let headerDiscount = '0.000';
    try {
      headerDiscount = parsePositiveDecimal(body['discount'], 'Discount');
    } catch {
      fieldErrors.push({ field: 'discount', message: 'Discount must be a non-negative number' });
    }

    const notes = normalise(body['notes']);

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Validate items individually ───────────────────────────────────────
    interface ValidatedItem {
      productId: string;
      quantity: string;
      unitPrice: string;
      total: string;
    }
    const validatedItems: ValidatedItem[] = [];

    for (let i = 0; i < (rawItems as unknown[]).length; i++) {
      const item = (rawItems as Record<string, unknown>[])[i];
      const idx = i + 1;

      const productId = normalise(item['productId']);
      if (!productId) {
        fieldErrors.push({ field: `items[${i}].productId`, message: `Item ${idx}: Product is required` });
        continue;
      }

      const rawQty = item['quantity'];
      const qty = parseFloat(String(rawQty ?? '0'));
      if (isNaN(qty) || qty <= 0) {
        fieldErrors.push({ field: `items[${i}].quantity`, message: `Item ${idx}: Quantity must be greater than 0` });
      }

      const rawPrice = item['unitPrice'];
      const price = parseFloat(String(rawPrice ?? '0'));
      if (isNaN(price) || price < 0) {
        fieldErrors.push({ field: `items[${i}].unitPrice`, message: `Item ${idx}: Unit price must be non-negative` });
      }

      const lineTotal = (qty * price).toFixed(3);

      validatedItems.push({
        productId,
        quantity: qty.toFixed(3),
        unitPrice: price.toFixed(3),
        total: lineTotal,
      });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Server-side total calculation ─────────────────────────────────────
    const subtotal = validatedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const discount = parseFloat(headerDiscount);

    if (discount > subtotal) {
      throw new ValidationError('Validation failed', {
        errors: [{ field: 'discount', message: 'Discount cannot exceed subtotal' }],
      });
    }

    const grandTotal = subtotal - discount;

    return prisma.$transaction(async (tx) => {
      // Verify supplier exists
      const supplier = await tx.supplier.findUnique({
        where: { id: supplierId! },
        select: { id: true },
      });
      if (!supplier) {
        throw new NotFoundError('Supplier');
      }

      // Verify all products exist
      for (const item of validatedItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { id: true },
        });
        if (!product) {
          throw new NotFoundError(`Product (${item.productId})`);
        }
      }

      // Generate purchase number
      const number = await DocumentNumberService.generateNextNumber(
        { model: 'purchase', prefix: 'PO', sequenceLength: 4 },
        tx,
      );

      // Create purchase with items
      const purchase = await PurchasesRepository.create(tx, {
        number,
        supplierId: supplierId!,
        userId,
        status,
        purchaseDate,
        totalAmount: subtotal.toFixed(3),
        discount: discount.toFixed(3),
        netAmount: grandTotal.toFixed(3),
        notes,
        items: validatedItems,
      });

      // Financials and Stock are not updated here since new purchases can only be DRAFT or CONFIRMED

      // ── Audit Log ───────────────────────────────────────────────────────────
      await tx.purchaseHistory.create({
        data: {
          purchaseId: purchase.id,
          toStatus: status,
          userId,
          notes: 'Purchase order created'
        }
      });

      return purchase;
    });
  },

  async update(id: string, userId: string, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Fetch existing purchase ───────────────────────────────────────────
    return prisma.$transaction(async (tx) => {
      const existing = await PurchasesRepository.findRawById(tx, id);
      if (!existing) throw new NotFoundError('Purchase');

      // Cannot edit cancelled purchases
      if (existing.status === 'CANCELLED') {
        throw new ConflictError('Cannot edit a cancelled purchase');
      }

      // ── Validate supplier ─────────────────────────────────────────────
      let supplierId: string | undefined;
      if ('supplierId' in body) {
        const sid = normalise(body['supplierId']);
        if (!sid) {
          fieldErrors.push({ field: 'supplierId', message: 'Supplier is required' });
        } else {
          const supplier = await tx.supplier.findUnique({
            where: { id: sid },
            select: { id: true },
          });
          if (!supplier) throw new NotFoundError('Supplier');
          supplierId = sid;
        }
      }

      // ── Validate purchase date ────────────────────────────────────────
      let purchaseDate: Date | undefined;
      if ('purchaseDate' in body) {
        const parsed = new Date(String(body['purchaseDate']));
        if (isNaN(parsed.getTime())) {
          fieldErrors.push({ field: 'purchaseDate', message: 'Invalid purchase date' });
        } else {
          purchaseDate = parsed;
        }
      }

      // ── Header discount ─────────────────────────────────────────────────
      let headerDiscount: string | undefined;
      if ('discount' in body) {
        try {
          headerDiscount = parsePositiveDecimal(body['discount'], 'Discount');
        } catch {
          fieldErrors.push({ field: 'discount', message: 'Discount must be a non-negative number' });
        }
      }

      const notes = 'notes' in body ? normalise(body['notes']) : undefined;

      // ── Validate items ────────────────────────────────────────────────
      interface ValidatedItem {
        productId: string;
        quantity: string;
        unitPrice: string;
        total: string;
      }
      let validatedItems: ValidatedItem[] | undefined;

      if ('items' in body) {
        const rawItems = body['items'];
        if (!Array.isArray(rawItems) || rawItems.length === 0) {
          fieldErrors.push({ field: 'items', message: 'At least one item is required' });
        } else {
          validatedItems = [];
          for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i] as Record<string, unknown>;
            const idx = i + 1;

            const productId = normalise(item['productId']);
            if (!productId) {
              fieldErrors.push({ field: `items[${i}].productId`, message: `Item ${idx}: Product is required` });
              continue;
            }

            // Verify product exists
            const product = await tx.product.findUnique({
              where: { id: productId },
              select: { id: true },
            });
            if (!product) {
              fieldErrors.push({ field: `items[${i}].productId`, message: `Item ${idx}: Product not found` });
              continue;
            }

            const rawQty = item['quantity'];
            const qty = parseFloat(String(rawQty ?? '0'));
            if (isNaN(qty) || qty <= 0) {
              fieldErrors.push({ field: `items[${i}].quantity`, message: `Item ${idx}: Quantity must be greater than 0` });
            }

            const rawPrice = item['unitPrice'];
            const price = parseFloat(String(rawPrice ?? '0'));
            if (isNaN(price) || price < 0) {
              fieldErrors.push({ field: `items[${i}].unitPrice`, message: `Item ${idx}: Unit price must be non-negative` });
            }

            const lineTotal = (qty * price).toFixed(3);
            validatedItems.push({
              productId,
              quantity: qty.toFixed(3),
              unitPrice: price.toFixed(3),
              total: lineTotal,
            });
          }
        }
      }

      if (fieldErrors.length > 0) {
        throw new ValidationError('Validation failed', { errors: fieldErrors });
      }

      // ── Server-side total recalculation ───────────────────────────────
      let totalAmount: string | undefined;
      let netAmount: string | undefined;

      if (validatedItems) {
        const subtotal = validatedItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
        const discount = parseFloat(headerDiscount ?? existing.discount.toFixed(3));

        if (discount > subtotal) {
          throw new ValidationError('Validation failed', {
            errors: [{ field: 'discount', message: 'Discount cannot exceed subtotal' }],
          });
        }

        totalAmount = subtotal.toFixed(3);
        netAmount = (subtotal - discount).toFixed(3);
      } else if (headerDiscount !== undefined) {
        // Items not changed, but discount changed — recalculate net
        const subtotal = parseFloat(existing.totalAmount.toFixed(3));
        const discount = parseFloat(headerDiscount);

        if (discount > subtotal) {
          throw new ValidationError('Validation failed', {
            errors: [{ field: 'discount', message: 'Discount cannot exceed subtotal' }],
          });
        }

        netAmount = (subtotal - discount).toFixed(3);
      }

      // ── If purchase is RECEIVED and items changed, adjust inventory ───
      if (existing.status === 'RECEIVED' && validatedItems) {
        // Build a map of old quantities by productId
        const oldQtyMap = new Map<string, number>();
        for (const oldItem of existing.items) {
          const prev = oldQtyMap.get(oldItem.productId) ?? 0;
          oldQtyMap.set(oldItem.productId, prev + parseFloat(oldItem.quantity.toFixed(3)));
        }

        // Build a map of new quantities by productId
        const newQtyMap = new Map<string, number>();
        for (const newItem of validatedItems) {
          const prev = newQtyMap.get(newItem.productId) ?? 0;
          newQtyMap.set(newItem.productId, prev + parseFloat(newItem.quantity));
        }

        // Calculate differences and apply adjustments
        const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
        for (const productId of allProductIds) {
          const oldQty = oldQtyMap.get(productId) ?? 0;
          const newQty = newQtyMap.get(productId) ?? 0;
          const diff = newQty - oldQty;

          if (diff !== 0) {
            await InventoryService.adjustStock(tx, productId, diff.toFixed(3));
          }
        }
      }

      if (existing.status === 'RECEIVED' && netAmount !== undefined && netAmount !== existing.netAmount.toFixed(3)) {
        await PurchaseFinancialService.recalculatePurchase(tx, id, existing.netAmount, netAmount);
      }

      let historyNotes = 'Purchase order updated.';
      const newNetAmount = netAmount ?? existing.netAmount.toFixed(3);
      if (Number(existing.netAmount) !== Number(newNetAmount)) {
        historyNotes += ` Amount changed from ${existing.netAmount} to ${newNetAmount}.`;
      }
      if (validatedItems && validatedItems.length !== existing.items.length) {
        historyNotes += ` Items count changed from ${existing.items.length} to ${validatedItems.length}.`;
      }

      // ── Audit Log ───────────────────────────────────────────────────────────
      await tx.purchaseHistory.create({
        data: {
          purchaseId: id,
          fromStatus: existing.status,
          toStatus: existing.status,
          userId,
          notes: historyNotes,
        }
      });

      return PurchasesRepository.update(tx, id, {
        supplierId,
        purchaseDate,
        totalAmount,
        discount: headerDiscount,
        netAmount,
        notes,
        items: validatedItems,
      });
    });
  },

  async updateStatus(id: string, userId: string, body: Record<string, unknown>) {
    const newStatus = normalise(body['status']) as PurchaseStatus | null;
    if (!newStatus || !['DRAFT', 'CONFIRMED', 'RECEIVED', 'CANCELLED'].includes(newStatus)) {
      throw new ValidationError('Invalid status value');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await PurchasesRepository.findRawById(tx, id);
      if (!existing) throw new NotFoundError('Purchase');

      // Validate transition
      const allowed = VALID_TRANSITIONS[existing.status];
      if (!allowed.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from ${existing.status} to ${newStatus}`,
        );
      }

      // ── Financial and Stock movements ────────────────────────────────
      // Moving TO RECEIVED
      if (newStatus === 'RECEIVED' && existing.status !== 'RECEIVED') {
        // 1. Update Inventory
        await InventoryService.adjustStockBatch(
          tx,
          existing.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity.toFixed(3),
          })),
        );
        // 2. Post Financials
        await PurchaseFinancialService.postPurchase(tx, id, existing.netAmount);
      }

      // Moving FROM RECEIVED to CANCELLED
      if (existing.status === 'RECEIVED' && newStatus === 'CANCELLED') {
        // 1. Reverse Inventory
        await InventoryService.adjustStockBatch(
          tx,
          existing.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity.negated().toFixed(3),
          })),
        );
        // 2. Reverse Financials
        await PurchaseFinancialService.reversePurchase(tx, id);
      }

      // ── Audit Log ───────────────────────────────────────────────────────────
      await tx.purchaseHistory.create({
        data: {
          purchaseId: id,
          fromStatus: existing.status,
          toStatus: newStatus,
          userId,
          notes: `Status changed to ${newStatus}`
        }
      });

      return PurchasesRepository.updateStatus(tx, id, newStatus);
    });
  },

  async delete(id: string, role?: string) {
    const purchase = await PurchasesRepository.findById(id);
    if (!purchase) throw new NotFoundError('Purchase');

    if (purchase.status !== 'DRAFT') {
      if (purchase.status === 'CANCELLED' && role === 'OWNER') {
        // Allow owner to delete cancelled purchases
      } else {
        throw new ConflictError(
          `Cannot delete a ${purchase.status.toLowerCase()} purchase. Cancel it first (and only OWNER can delete cancelled ones).`,
        );
      }
    }

    await PurchasesRepository.delete(id);
  },
};
