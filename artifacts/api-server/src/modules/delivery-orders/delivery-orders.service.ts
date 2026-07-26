import { DeliveryOrderStatus, OrderSource, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { DeliveryOrdersRepository, type DeliveryOrderFilters } from './delivery-orders.repository.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError.js';

// ─── Valid status transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
  DRAFT:      ['APPROVED', 'CANCELLED'],
  APPROVED:   ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED:  [],
  CANCELLED:  [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveDecimal(value: unknown, fieldName: string): string {
  if (value === undefined || value === null || value === '') {
    return '0.000';
  }
  const parsed = parseFloat(String(value));
  if (isNaN(parsed)) {
    throw new ValidationError(`${fieldName} must be a valid number`);
  }
  if (parsed <= 0) {
    throw new ValidationError(`${fieldName} must be greater than zero`);
  }
  return parsed.toFixed(3);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const DeliveryOrdersService = {
  async list(filters: DeliveryOrderFilters) {
    return DeliveryOrdersRepository.findAll(filters);
  },

  async getById(id: string) {
    const order = await DeliveryOrdersRepository.findById(id);
    if (!order) throw new NotFoundError('Delivery Order');
    return order;
  },

  async getStatistics() {
    return DeliveryOrdersRepository.getStatistics();
  },

  // ── Create ──────────────────────────────────────────────────────────────
  async create(userId: string, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Validate Customer ────────────────────────────────────────────────
    const customerId = normalise(body['customerId']);
    if (!customerId) {
      fieldErrors.push({ field: 'customerId', message: 'Customer is required' });
    }

    const orderType = normalise(body['orderType']) as OrderSource | null;
    if (orderType !== 'CUSTOMER_PO' && orderType !== 'DIRECT') {
      fieldErrors.push({ field: 'orderType', message: 'Order type must be CUSTOMER_PO or DIRECT' });
    }

    const customerPONumber = normalise(body['customerPONumber']);
    if (orderType === 'CUSTOMER_PO' && !customerPONumber) {
      fieldErrors.push({ field: 'customerPONumber', message: 'Customer PO Number is required for Corporate orders' });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Load Customer Snapshot ───────────────────────────────────────────
    const customer = await prisma.customer.findUnique({ where: { id: customerId! } });
    if (!customer) {
      fieldErrors.push({ field: 'customerId', message: 'Customer not found' });
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Validate items ───────────────────────────────────────────────────
    const rawItems = body['items'];
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      fieldErrors.push({ field: 'items', message: 'At least one item is required' });
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const validatedItems: {
      productId: string;
      productNameSnapshot: string;
      productCodeSnapshot: string;
      unitSnapshot: string;
      quantity: string;
      remarks?: string | null;
    }[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i] as Record<string, unknown>;
      const productId = normalise(item['productId']);

      if (!productId) {
        fieldErrors.push({ field: `items.${i}.productId`, message: 'Product is required' });
        continue;
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { unit: true },
      });

      if (!product) {
        fieldErrors.push({ field: `items.${i}.productId`, message: 'Product not found' });
        continue;
      }

      let quantityStr = '0.000';
      try {
        quantityStr = parsePositiveDecimal(item['quantity'], `items.${i}.quantity`);
      } catch (err: any) {
        fieldErrors.push({ field: `items.${i}.quantity`, message: err.message });
      }

      validatedItems.push({
        productId,
        productNameSnapshot: product.name,
        productCodeSnapshot: product.sku,
        unitSnapshot: product.unit.abbreviation,
        quantity: quantityStr,
        remarks: normalise(item['remarks']),
      });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Execute Creation ─────────────────────────────────────────────────
    return prisma.$transaction(async (tx) => {
      // Generate immutable numbers
      const doNumber = await DocumentNumberService.generateDeliveryOrderNumber(tx);
      const internalSONumber = await DocumentNumberService.generateInternalSONumber(tx);

      return DeliveryOrdersRepository.create(tx, {
        number: doNumber,
        internalSONumber,
        customerPONumber: orderType === 'CUSTOMER_PO' ? customerPONumber : null,
        orderType: orderType!,
        customerId: customerId!,
        customerNameSnapshot: customer.name,
        status: 'DRAFT',
        deliveryDate: body['deliveryDate'] ? new Date(String(body['deliveryDate'])) : null,
        deliveryAddress: normalise(body['deliveryAddress']),
        site: normalise(body['site']),
        contactPerson: normalise(body['contactPerson']),
        contactNumber: normalise(body['contactNumber']),
        driverName: normalise(body['driverName']),
        vehicleNumber: normalise(body['vehicleNumber']),
        notes: normalise(body['notes']),
        internalNotes: normalise(body['internalNotes']),
        createdById: userId,
        items: validatedItems,
      });
    });
  },

  // ── Duplicate ───────────────────────────────────────────────────────────
  async duplicate(userId: string, id: string) {
    const existing = await DeliveryOrdersRepository.findById(id);
    if (!existing) throw new NotFoundError('Delivery Order');

    return prisma.$transaction(async (tx) => {
      const doNumber = await DocumentNumberService.generateDeliveryOrderNumber(tx);
      const internalSONumber = await DocumentNumberService.generateInternalSONumber(tx);

      return DeliveryOrdersRepository.create(tx, {
        number: doNumber,
        internalSONumber,
        customerPONumber: existing.customerPONumber,
        orderType: existing.orderType,
        customerId: existing.customerId,
        customerNameSnapshot: existing.customerNameSnapshot,
        status: 'DRAFT',
        deliveryDate: existing.deliveryDate,
        deliveryAddress: existing.deliveryAddress,
        site: existing.site,
        contactPerson: existing.contactPerson,
        contactNumber: existing.contactNumber,
        driverName: existing.driverName,
        vehicleNumber: existing.vehicleNumber,
        notes: existing.notes,
        internalNotes: existing.internalNotes,
        createdById: userId,
        items: existing.items.map((item) => ({
          productId: item.productId,
          productNameSnapshot: item.productNameSnapshot,
          productCodeSnapshot: item.productCodeSnapshot,
          unitSnapshot: item.unitSnapshot,
          quantity: item.quantity,
          remarks: item.remarks,
        })),
      });
    });
  },

  // ── Update ──────────────────────────────────────────────────────────────
  async update(id: string, body: Record<string, unknown>) {
    const existing = await DeliveryOrdersRepository.findById(id);
    if (!existing) throw new NotFoundError('Delivery Order');

    if (existing.status !== 'DRAFT') {
      throw new ConflictError('Only DRAFT delivery orders can be modified');
    }

    const fieldErrors: { field: string; message: string }[] = [];
    const rawItems = body['items'];
    let validatedItems: any[] | undefined = undefined;

    if (rawItems !== undefined) {
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        fieldErrors.push({ field: 'items', message: 'At least one item is required' });
      } else {
        validatedItems = [];
        for (let i = 0; i < rawItems.length; i++) {
          const item = rawItems[i] as Record<string, unknown>;
          const productId = normalise(item['productId']);

          if (!productId) {
            fieldErrors.push({ field: `items.${i}.productId`, message: 'Product is required' });
            continue;
          }

          const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { unit: true },
          });

          if (!product) {
            fieldErrors.push({ field: `items.${i}.productId`, message: 'Product not found' });
            continue;
          }

          let quantityStr = '0.000';
          try {
            quantityStr = parsePositiveDecimal(item['quantity'], `items.${i}.quantity`);
          } catch (err: any) {
            fieldErrors.push({ field: `items.${i}.quantity`, message: err.message });
          }

          validatedItems.push({
            productId,
            productNameSnapshot: product.name,
            productCodeSnapshot: product.sku,
            unitSnapshot: product.unit.abbreviation,
            quantity: quantityStr,
            remarks: normalise(item['remarks']),
          });
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    return prisma.$transaction(async (tx) => {
      return DeliveryOrdersRepository.update(tx, id, {
        deliveryDate: body['deliveryDate'] !== undefined ? (body['deliveryDate'] ? new Date(String(body['deliveryDate'])) : null) : undefined,
        deliveryAddress: body['deliveryAddress'] !== undefined ? normalise(body['deliveryAddress']) : undefined,
        site: body['site'] !== undefined ? normalise(body['site']) : undefined,
        contactPerson: body['contactPerson'] !== undefined ? normalise(body['contactPerson']) : undefined,
        contactNumber: body['contactNumber'] !== undefined ? normalise(body['contactNumber']) : undefined,
        driverName: body['driverName'] !== undefined ? normalise(body['driverName']) : undefined,
        vehicleNumber: body['vehicleNumber'] !== undefined ? normalise(body['vehicleNumber']) : undefined,
        notes: body['notes'] !== undefined ? normalise(body['notes']) : undefined,
        internalNotes: body['internalNotes'] !== undefined ? normalise(body['internalNotes']) : undefined,
        items: validatedItems,
      });
    });
  },

  // ── Update Status ───────────────────────────────────────────────────────
  async updateStatus(
    userId: string,
    id: string,
    status: DeliveryOrderStatus,
    body: Record<string, unknown>
  ) {
    const existing = await DeliveryOrdersRepository.findById(id);
    if (!existing) throw new NotFoundError('Delivery Order');

    const allowedNext = VALID_TRANSITIONS[existing.status];
    if (!allowedNext.includes(status)) {
      throw new ConflictError(`Cannot transition from ${existing.status} to ${status}`);
    }

    let cancelReason: string | null = null;
    if (status === 'CANCELLED') {
      cancelReason = normalise(body['cancelReason']);
      if (!cancelReason) {
        throw new ValidationError('Validation failed', {
          errors: [{ field: 'cancelReason', message: 'Cancel reason is required' }],
        });
      }
    }

    return prisma.$transaction(async (tx) => {
      // Generate audit timestamps
      const now = new Date();
      const auditFields: any = {};
      if (status === 'APPROVED') {
        auditFields.approvedById = userId;
        auditFields.approvedAt = now;
      } else if (status === 'DISPATCHED') {
        auditFields.dispatchedById = userId;
        auditFields.dispatchedAt = now;
      } else if (status === 'DELIVERED') {
        auditFields.deliveredById = userId;
        auditFields.deliveredAt = now;
      } else if (status === 'CANCELLED') {
        auditFields.cancelledById = userId;
        auditFields.cancelledAt = now;
        auditFields.cancelReason = cancelReason;
      }

      // Handle stock movements via InventoryService
      if (status === 'DISPATCHED') {
        // Deduct inventory when dispatched
        for (const item of existing.items) {
          const qty = Number(item.quantity);
          if (qty > 0) {
            await InventoryService.decreaseStock(
              tx,
              item.productId,
              qty.toString()
            );
          }
        }
      } else if (status === 'CANCELLED' && ['DISPATCHED', 'DELIVERED'].includes(existing.status)) {
        // Restore inventory if it was already deducted
        for (const item of existing.items) {
          const qty = Number(item.quantity);
          if (qty > 0) {
            await InventoryService.increaseStock(
              tx,
              item.productId,
              qty.toString()
            );
          }
        }
      }

      const historyNotes = status === 'CANCELLED' ? cancelReason! : undefined;

      return DeliveryOrdersRepository.updateStatus(
        tx,
        id,
        existing.status,
        status,
        userId,
        auditFields,
        historyNotes
      );
    });
  },

  // ── Delete ──────────────────────────────────────────────────────────────
  async delete(id: string) {
    const existing = await DeliveryOrdersRepository.findById(id);
    if (!existing) throw new NotFoundError('Delivery Order');

    if (existing.status !== 'DRAFT') {
      throw new ConflictError('Only DRAFT delivery orders can be deleted. For other statuses, use Cancel.');
    }

    await prisma.$transaction(async (tx) => {
      await DeliveryOrdersRepository.delete(tx, id);
    });
  },
};
