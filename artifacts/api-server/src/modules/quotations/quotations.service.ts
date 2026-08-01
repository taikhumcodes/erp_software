import { QuotationStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { QuotationsRepository, type QuotationFilters } from './quotations.repository.js';
import { NotFoundError, ValidationError, ConflictError } from '../../errors/AppError.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';

// ─── Valid status transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT:     ['SENT', 'CANCELLED'],
  SENT:      ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  ACCEPTED:  ['CONVERTED', 'CANCELLED'],
  REJECTED:  [],
  EXPIRED:   [],
  CANCELLED: [],
  CONVERTED: [],
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

export const QuotationsService = {
  async list(filters: QuotationFilters) {
    return QuotationsRepository.findAll(filters);
  },

  async getById(id: string) {
    const quotation = await QuotationsRepository.findById(id);
    if (!quotation) throw new NotFoundError('Quotation');
    return quotation;
  },

  async getStatistics() {
    return QuotationsRepository.getStatistics();
  },

  async getHistory(id: string) {
    return prisma.quotationHistory.findMany({
      where: { quotationId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    });
  },

  async create(userId: string, body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Validate customer ─────────────────────────────────────────────────
    const customerId = normalise(body['customerId']);
    const customerName = normalise(body['customerName']);
    
    if (!customerId && !customerName) {
      fieldErrors.push({ field: 'customerId', message: 'Customer or Customer Name is required' });
    }
    
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        fieldErrors.push({ field: 'customerId', message: 'Customer not found' });
      } else if (!customer.isActive) {
        fieldErrors.push({ field: 'customerId', message: 'Customer is inactive' });
      }
    }

    // ── Validate quotation date ────────────────────────────────────────────
    let quotationDate = new Date();
    const rawDate = body['quotationDate'];
    if (rawDate) {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'quotationDate', message: 'Invalid quotation date' });
      } else {
        quotationDate = parsed;
      }
    }

    // ── Validity date ──────────────────────────────────────────────────────
    let validityDate: Date | null = null;
    const rawValidity = body['validityDate'];
    if (rawValidity) {
      const parsed = new Date(String(rawValidity));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'validityDate', message: 'Invalid validity date' });
      } else {
        validityDate = parsed;
      }
    }

    const rawStatus = normalise(body['status']);
    const status: QuotationStatus = rawStatus === 'SENT' ? 'SENT' : 'DRAFT';

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

    let roundOff = '0.000';
    try {
      roundOff = parseDecimal(body['roundOff'], 'Round Off');
    } catch {
      fieldErrors.push({ field: 'roundOff', message: 'Round Off must be a valid number' });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Process items ──────────────────────────────────────────────────────
    let calculatedTotal = 0;
    const validatedItems: {
      productId: string;
      description: string | null;
      countryOfOrigin: string | null;
      quantity: string;
      unitPrice: string;
      amount: string;
    }[] = [];
    const productIds = new Set<string>();
    const itemsArr = rawItems as unknown[];

    for (let i = 0; i < itemsArr.length; i++) {
      const row = itemsArr[i] as Record<string, unknown>;
      const productId = normalise(row['productId']);
      const description = normalise(row['description']);
      const productNameAr = normalise(row['productNameAr']);
      
      if (!productId && !description) {
        fieldErrors.push({ field: `items[${i}]`, message: 'Product or Description is required' });
        continue;
      }

      if (productId) {
        productIds.add(productId);
      }

      try {
        const qty = parsePositiveDecimal(row['quantity'], 'Quantity');
        const price = parsePositiveDecimal(row['unitPrice'], 'Unit Price');

        if (parseFloat(qty) === 0) {
          fieldErrors.push({ field: `items[${i}].quantity`, message: 'Quantity must be greater than zero' });
        }

        const lineTotal = parseFloat(qty) * parseFloat(price);
        calculatedTotal += lineTotal;

        validatedItems.push({
          productId: productId || null,
          description,
          productNameAr,
          countryOfOrigin: normalise(row['countryOfOrigin']),
          quantity: qty,
          unitPrice: price,
          amount: lineTotal.toFixed(3),
        });
      } catch (err) {
        if (err instanceof ValidationError) {
          fieldErrors.push({ field: `items[${i}]`, message: err.message });
        }
      }
    }

    // ── Validate products exist (no stock check — quotations don't affect inventory)
    if (productIds.size > 0) {
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: Array.from(productIds) } },
        select: { id: true, name: true, isActive: true },
      });

      for (const pid of productIds) {
        const p = dbProducts.find((x) => x.id === pid);
        if (!p) {
          fieldErrors.push({ field: 'items', message: `Product ${pid} not found` });
        } else if (!p.isActive) {
          fieldErrors.push({ field: 'items', message: `Product "${p.name}" is inactive` });
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const grandTotal = calculatedTotal - parseFloat(headerDiscount) + parseFloat(roundOff);

    return prisma.$transaction(async (tx) => {
      const number = await DocumentNumberService.generateQuotationNumber(tx);

      const newQuotation = await QuotationsRepository.create(tx, {
        number,
        customerId: customerId || null,
        customerName: normalise(body['customerName']),
        customerNameAr: normalise(body['customerNameAr']),
        quotationBy: normalise(body['quotationBy']),
        quotationByAr: normalise(body['quotationByAr']),
        quotationByAddress: normalise(body['quotationByAddress']),
        userId,
        salespersonId: normalise(body['salespersonId']),
        status,
        quotationDate,
        validityDate,
        referenceNumber: normalise(body['referenceNumber']),
        customerReference: normalise(body['customerReference']),
        totalAmount: calculatedTotal.toFixed(3),
        discount: headerDiscount,
        roundOff,
        grandTotal: grandTotal.toFixed(3),
        notes: normalise(body['notes']),
        termsAndConditions: normalise(body['termsAndConditions']),
        contactPerson: normalise(body['contactPerson']),
        phone: normalise(body['phone']),
        email: normalise(body['email']),
        address: normalise(body['address']),
        country: normalise(body['country']),
        items: validatedItems,
      });

      await tx.quotationHistory.create({
        data: {
          quotationId: newQuotation.id,
          action: 'CREATE',
          toStatus: status,
          userId,
          notes: 'Quotation created',
        },
      });

      return newQuotation;
    });
  },

  async update(id: string, userId: string, body: Record<string, unknown>) {
    const existing = await QuotationsRepository.findById(id);
    if (!existing) throw new NotFoundError('Quotation');

    if (existing.status !== 'DRAFT' && existing.status !== 'SENT') {
      throw new ConflictError('Only DRAFT or SENT quotations can be edited');
    }

    const fieldErrors: { field: string; message: string }[] = [];

    // ── Customer ──────────────────────────────────────────────────────────
    let customerId = existing.customerId;
    if (body['customerId'] !== undefined || body['customerName'] !== undefined) {
      customerId = normalise(body['customerId']) ?? null;
      const customerName = normalise(body['customerName']);
      
      if (!customerId && !customerName) {
        fieldErrors.push({ field: 'customerId', message: 'Customer or Customer Name is required' });
      }
      
      if (customerId && customerId !== existing.customerId) {
        const customer = await prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer) {
          fieldErrors.push({ field: 'customerId', message: 'Customer not found' });
        } else if (!customer.isActive) {
          fieldErrors.push({ field: 'customerId', message: 'Customer is inactive' });
        }
      }
    }

    // ── Dates ──────────────────────────────────────────────────────────────
    let quotationDate: Date | undefined;
    const rawDate = body['quotationDate'];
    if (rawDate) {
      const parsed = new Date(String(rawDate));
      if (isNaN(parsed.getTime())) {
        fieldErrors.push({ field: 'quotationDate', message: 'Invalid quotation date' });
      } else {
        quotationDate = parsed;
      }
    }

    let validityDate: Date | null | undefined;
    if (body['validityDate'] !== undefined) {
      if (body['validityDate'] === null || body['validityDate'] === '') {
        validityDate = null;
      } else {
        const parsed = new Date(String(body['validityDate']));
        if (isNaN(parsed.getTime())) {
          fieldErrors.push({ field: 'validityDate', message: 'Invalid validity date' });
        } else {
          validityDate = parsed;
        }
      }
    }

    // ── Discount & Round Off ──────────────────────────────────────────────
    let headerDiscount = existing.discount;
    if (body['discount'] !== undefined) {
      try {
        headerDiscount = parsePositiveDecimal(body['discount'], 'Discount');
      } catch {
        fieldErrors.push({ field: 'discount', message: 'Discount must be a non-negative number' });
      }
    }

    let roundOff = existing.roundOff;
    if (body['roundOff'] !== undefined) {
      try {
        roundOff = parseDecimal(body['roundOff'], 'Round Off');
      } catch {
        fieldErrors.push({ field: 'roundOff', message: 'Round Off must be a valid number' });
      }
    }

    // ── Items ─────────────────────────────────────────────────────────────
    const rawItems = body['items'];
    if (rawItems !== undefined && (!Array.isArray(rawItems) || rawItems.length === 0)) {
      fieldErrors.push({ field: 'items', message: 'At least one item is required' });
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    let validatedItems: {
      productId?: string | null;
      description: string | null;
      productNameAr: string | null;
      countryOfOrigin: string | null;
      quantity: string;
      unitPrice: string;
      amount: string;
    }[] | undefined;
    let calculatedTotal = parseFloat(existing.totalAmount);

    if (rawItems !== undefined) {
      calculatedTotal = 0;
      validatedItems = [];
      const productIds = new Set<string>();
      const itemsArr = rawItems as unknown[];

      for (let i = 0; i < itemsArr.length; i++) {
        const row = itemsArr[i] as Record<string, unknown>;
        const productId = normalise(row['productId']);
        const description = normalise(row['description']);
        const productNameAr = normalise(row['productNameAr']);
        
        if (!productId && !description) {
          fieldErrors.push({ field: `items[${i}]`, message: 'Product or Description is required' });
          continue;
        }

        if (productId) {
          productIds.add(productId);
        }

        try {
          const qty = parsePositiveDecimal(row['quantity'], 'Quantity');
          const price = parsePositiveDecimal(row['unitPrice'], 'Unit Price');

          if (parseFloat(qty) === 0) {
            fieldErrors.push({ field: `items[${i}].quantity`, message: 'Quantity must be greater than zero' });
          }

          const lineTotal = parseFloat(qty) * parseFloat(price);
          calculatedTotal += lineTotal;

          validatedItems.push({
            productId: productId || null,
            description,
            productNameAr,
            countryOfOrigin: normalise(row['countryOfOrigin']),
            quantity: qty,
            unitPrice: price,
            amount: lineTotal.toFixed(3),
          });
        } catch (err) {
          if (err instanceof ValidationError) {
            fieldErrors.push({ field: `items[${i}]`, message: err.message });
          }
        }
      }

      // Validate products exist (no stock check)
      if (productIds.size > 0) {
        const dbProducts = await prisma.product.findMany({
          where: { id: { in: Array.from(productIds) } },
          select: { id: true, name: true, isActive: true },
        });

        for (const pid of productIds) {
          const p = dbProducts.find((x) => x.id === pid);
          if (!p) {
            fieldErrors.push({ field: 'items', message: `Product ${pid} not found` });
          } else if (!p.isActive) {
            fieldErrors.push({ field: 'items', message: `Product "${p.name}" is inactive` });
          }
        }
      }
    }

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    const grandTotal = calculatedTotal - parseFloat(headerDiscount) + parseFloat(roundOff);

    return prisma.$transaction(async (tx) => {
      await tx.quotationHistory.create({
        data: {
          quotationId: id,
          action: 'EDIT',
          fromStatus: existing.status as QuotationStatus,
          toStatus: existing.status as QuotationStatus,
          userId,
          notes: 'Quotation updated',
        },
      });

      return QuotationsRepository.update(tx, id, {
        customerId: customerId !== existing.customerId ? (customerId || null) : undefined,
        customerName: body['customerName'] !== undefined ? normalise(body['customerName']) : undefined,
        customerNameAr: body['customerNameAr'] !== undefined ? normalise(body['customerNameAr']) : undefined,
        quotationBy: body['quotationBy'] !== undefined ? normalise(body['quotationBy']) : undefined,
        quotationByAr: body['quotationByAr'] !== undefined ? normalise(body['quotationByAr']) : undefined,
        quotationByAddress: body['quotationByAddress'] !== undefined ? normalise(body['quotationByAddress']) : undefined,
        salespersonId: body['salespersonId'] !== undefined ? normalise(body['salespersonId']) : undefined,
        status: body['status'] as any,
        quotationDate,
        validityDate,
        referenceNumber: body['referenceNumber'] !== undefined ? normalise(body['referenceNumber']) : undefined,
        customerReference: body['customerReference'] !== undefined ? normalise(body['customerReference']) : undefined,
        totalAmount: calculatedTotal.toFixed(3),
        discount: headerDiscount,
        roundOff,
        grandTotal: grandTotal.toFixed(3),
        notes: body['notes'] !== undefined ? normalise(body['notes']) : undefined,
        termsAndConditions: body['termsAndConditions'] !== undefined ? normalise(body['termsAndConditions']) : undefined,
        contactPerson: body['contactPerson'] !== undefined ? normalise(body['contactPerson']) : undefined,
        phone: body['phone'] !== undefined ? normalise(body['phone']) : undefined,
        email: body['email'] !== undefined ? normalise(body['email']) : undefined,
        address: body['address'] !== undefined ? normalise(body['address']) : undefined,
        country: body['country'] !== undefined ? normalise(body['country']) : undefined,
        items: validatedItems,
      });
    });
  },

  async updateStatus(id: string, userId: string, body: Record<string, unknown>) {
    const existing = await QuotationsRepository.findById(id);
    if (!existing) throw new NotFoundError('Quotation');

    const rawStatus = normalise(body['status']);
    if (!rawStatus) {
      throw new ValidationError('Status is required');
    }

    const newStatus = rawStatus as QuotationStatus;
    const oldStatus = existing.status as QuotationStatus;

    if (newStatus === oldStatus) {
      return existing;
    }

    const validNext = VALID_TRANSITIONS[oldStatus] ?? [];
    if (!validNext.includes(newStatus)) {
      throw new ConflictError(`Cannot transition quotation from ${oldStatus} to ${newStatus}`);
    }

    return prisma.$transaction(async (tx) => {
      // Auto-create customer if accepted and customer is a one-off
      if (newStatus === 'ACCEPTED' && !existing.customerId && (existing as any).customerName) {
        const newCustomer = await tx.customer.create({
          data: {
            code: `CUST-${Date.now()}`,
            name: (existing as any).customerName,
            nameAr: (existing as any).customerNameAr || null,
            address: existing.address || null,
            phone: existing.phone || null,
            email: existing.email || null,
            isActive: true,
          }
        });
        await tx.quotation.update({
          where: { id },
          data: { customerId: newCustomer.id }
        });
      }

      await tx.quotationHistory.create({
        data: {
          quotationId: id,
          action: 'STATUS_CHANGE',
          fromStatus: oldStatus,
          toStatus: newStatus,
          userId,
          notes: `Status changed to ${newStatus}`,
        },
      });

      return QuotationsRepository.updateStatus(tx, id, newStatus);
    });
  },

  async duplicate(id: string, userId: string) {
    const existing = await QuotationsRepository.findById(id);
    if (!existing) throw new NotFoundError('Quotation');

    return prisma.$transaction(async (tx) => {
      const number = await DocumentNumberService.generateQuotationNumber(tx);

      const newQuotation = await QuotationsRepository.create(tx, {
        number,
        customerId: existing.customerId || null,
        customerName: (existing as any).customerName || null,
        customerNameAr: (existing as any).customerNameAr || null,
        quotationBy: (existing as any).quotationBy || null,
        quotationByAr: (existing as any).quotationByAr || null,
        quotationByAddress: (existing as any).quotationByAddress || null,
        userId,
        salespersonId: existing.salespersonId,
        status: 'DRAFT',
        quotationDate: new Date(),
        validityDate: existing.validityDate ? new Date(existing.validityDate) : null,
        referenceNumber: existing.referenceNumber,
        customerReference: existing.customerReference,
        totalAmount: existing.totalAmount,
        discount: existing.discount,
        roundOff: existing.roundOff,
        grandTotal: existing.grandTotal,
        notes: existing.notes,
        termsAndConditions: existing.termsAndConditions,
        contactPerson: existing.contactPerson,
        phone: existing.phone,
        email: existing.email,
        address: existing.address,
        country: existing.country,
        items: existing.items.map((item: any) => ({
          productId: item.productId,
          description: item.description,
          countryOfOrigin: item.countryOfOrigin,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
      });

      await tx.quotationHistory.create({
        data: {
          quotationId: newQuotation.id,
          action: 'DUPLICATE',
          toStatus: 'DRAFT',
          userId,
          notes: `Duplicated from ${existing.number}`,
        },
      });

      return newQuotation;
    });
  },

  async convert(id: string, userId: string, _body: Record<string, unknown>) {
    const existing = await QuotationsRepository.findById(id);
    if (!existing) throw new NotFoundError('Quotation');

    if (existing.status !== 'ACCEPTED') {
      throw new ConflictError('Only ACCEPTED quotations can be converted');
    }

    if (existing.convertedToSaleId) {
      throw new ConflictError('Quotation has already been converted');
    }

    const hasAdHocItems = existing.items.some((item: any) => !item.productId);
    if (hasAdHocItems) {
      throw new ConflictError('Quotations containing Ad-hoc (non-stock) items cannot be automatically converted to Sales Invoices. Please create the Sales Invoice manually.');
    }

    return prisma.$transaction(async (tx) => {
      // Generate sale number
      const saleNumber = await DocumentNumberService.generateInvoiceNumber(tx);
      const internalSONumber = await DocumentNumberService.generateInternalSONumber(tx);

      // Create the Sale from quotation data — preserving countryOfOrigin from quotation (not re-fetched from Product)
      const sale = await tx.sale.create({
        data: {
          number: saleNumber,
          internalSONumber,
          customerId: existing.customerId!,
          userId,
          status: 'DRAFT',
          saleDate: new Date(),
          totalAmount: existing.totalAmount,
          discount: existing.discount,
          netAmount: existing.grandTotal, // grandTotal = totalAmount - discount + roundOff
          notes: existing.notes ? `${existing.notes}\n[Converted from Quotation ${existing.number}]` : `[Converted from Quotation ${existing.number}]`,
          orderSource: 'DIRECT',
          items: {
            create: existing.items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.amount,
            })),
          },
        },
      });

      // Mark quotation as CONVERTED
      await tx.quotation.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedToSaleId: sale.id,
          convertedAt: new Date(),
          convertedById: userId,
        },
      });

      // Audit log on quotation
      await tx.quotationHistory.create({
        data: {
          quotationId: id,
          action: 'CONVERT',
          fromStatus: 'ACCEPTED',
          toStatus: 'CONVERTED',
          userId,
          notes: `Converted to Sales Invoice ${saleNumber}`,
          newValue: { saleId: sale.id, saleNumber },
        },
      });

      // Audit log on sale
      await tx.saleHistory.create({
        data: {
          saleId: sale.id,
          toStatus: 'DRAFT',
          userId,
          notes: `Created from Quotation ${existing.number}`,
        },
      });

      return QuotationsRepository.findById(id);
    });
  },

  async delete(id: string, userId: string, role?: string) {
    const existing = await QuotationsRepository.findById(id);
    if (!existing) throw new NotFoundError('Quotation');

    // Allowed to delete from any status
    // if (existing.status !== 'DRAFT') {
    //   if (existing.status === 'CANCELLED' && (role === 'OWNER' || role === 'MANAGER')) {
    //     // Allow owner/manager to delete cancelled quotations
    //   } else {
    //     throw new ConflictError('Only DRAFT quotations can be deleted, or CANCELLED by OWNER/MANAGER');
    //   }
    // }

    return prisma.$transaction(async (tx) => {
      await tx.quotationHistory.create({
        data: {
          quotationId: id,
          action: 'DELETE',
          fromStatus: existing.status as QuotationStatus,
          userId,
          notes: 'Quotation deleted',
        },
      });

      await QuotationsRepository.delete(tx, id);
    });
  },

  async logAction(quotationId: string, action: string, userId: string, notes?: string) {
    await prisma.quotationHistory.create({
      data: {
        quotationId,
        action,
        userId,
        notes,
      },
    });
  },
};
