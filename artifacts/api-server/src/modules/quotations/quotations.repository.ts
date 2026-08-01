import { prisma } from '../../lib/prisma.js';
import { Prisma, QuotationStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QuotationFilters {
  search?: string;
  status?: QuotationStatus;
  customerId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'number' | 'quotationDate' | 'grandTotal' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateQuotationItemData {
  productId?: string | null;
  description?: string | null;
  productNameAr?: string | null;
  countryOfOrigin?: string | null;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder?: number;
}

export interface CreateQuotationData {
  number: string;
  customerId?: string | null;
  customerName?: string | null;
  customerNameAr?: string | null;
  quotationBy?: string | null;
  quotationByAr?: string | null;
  quotationByAddress?: string | null;
  userId: string;
  salespersonId?: string | null;
  status: QuotationStatus;
  quotationDate: Date;
  validityDate?: Date | null;
  referenceNumber?: string | null;
  customerReference?: string | null;
  totalAmount: string;
  discount: string;
  roundOff: string;
  grandTotal: string;
  notes?: string | null;
  termsAndConditions?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  country?: string | null;
  items: CreateQuotationItemData[];
}

export interface UpdateQuotationData {
  customerId?: string | null;
  customerName?: string | null;
  customerNameAr?: string | null;
  quotationBy?: string | null;
  quotationByAr?: string | null;
  quotationByAddress?: string | null;
  salespersonId?: string | null;
  quotationDate?: Date;
  validityDate?: Date | null;
  referenceNumber?: string | null;
  customerReference?: string | null;
  totalAmount?: string;
  discount?: string;
  roundOff?: string;
  grandTotal?: string;
  notes?: string | null;
  termsAndConditions?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  country?: string | null;
  status?: QuotationStatus;
  items?: CreateQuotationItemData[];
}

// ─── Select definitions ──────────────────────────────────────────────────────

const quotationSelect = {
  id: true,
  number: true,
  customerId: true,
  customerName: true,
  customerNameAr: true,
  quotationBy: true,
  quotationByAr: true,
  quotationByAddress: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true, phone: true, email: true, address: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  salespersonId: true,
  salesperson: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  quotationDate: true,
  validityDate: true,
  referenceNumber: true,
  customerReference: true,
  totalAmount: true,
  discount: true,
  roundOff: true,
  grandTotal: true,
  notes: true,
  termsAndConditions: true,
  contactPerson: true,
  phone: true,
  email: true,
  address: true,
  country: true,
  convertedToSaleId: true,
  convertedToSale: { select: { id: true, number: true } },
  convertedAt: true,
  convertedById: true,
  revisionNumber: true,
  parentQuotationId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
          nameAr: true,
          countryOfOrigin: true,
          unit: { select: { id: true, name: true, nameAr: true, abbreviation: true } },
        },
      },
      description: true,
      productNameAr: true,
      countryOfOrigin: true,
      quantity: true,
      unitPrice: true,
      amount: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.QuotationSelect;

const quotationListSelect = {
  id: true,
  number: true,
  customerId: true,
  customerName: true,
  customerNameAr: true,
  quotationBy: true,
  quotationByAr: true,
  quotationByAddress: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  salespersonId: true,
  salesperson: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  quotationDate: true,
  validityDate: true,
  grandTotal: true,
  convertedToSaleId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.QuotationSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const QuotationsRepository = {
  // ── List with search / filter / sort / pagination ────────────────────────
  async findAll(filters: QuotationFilters = {}) {
    const {
      search,
      status,
      customerId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.QuotationWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { customerReference: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { nameAr: { contains: q, mode: 'insensitive' } } },
        { customer: { code: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const orderByMap: Record<string, Prisma.QuotationOrderByWithRelationInput> = {
      number:        { number: sortOrder },
      quotationDate: { quotationDate: sortOrder },
      grandTotal:    { grandTotal: sortOrder },
      createdAt:     { createdAt: sortOrder },
      status:        { status: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({ where, select: quotationListSelect, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializeQuotationList),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  // ── Single with items ────────────────────────────────────────────────────
  async findById(id: string) {
    const row = await prisma.quotation.findUnique({ where: { id }, select: quotationSelect });
    return row ? serializeQuotation(row) : null;
  },

  // ── Create (within transaction) ──────────────────────────────────────────
  async create(tx: Prisma.TransactionClient, data: CreateQuotationData) {
    const row = await tx.quotation.create({
      data: {
        number:            data.number,
        customerId:        data.customerId,
        userId:            data.userId,
        salespersonId:     data.salespersonId ?? null,
        status:            data.status,
        quotationDate:     data.quotationDate,
        validityDate:      data.validityDate ?? null,
        referenceNumber:   data.referenceNumber ?? null,
        customerReference: data.customerReference ?? null,
        totalAmount:       new Prisma.Decimal(data.totalAmount),
        discount:          new Prisma.Decimal(data.discount),
        roundOff:          new Prisma.Decimal(data.roundOff),
        grandTotal:        new Prisma.Decimal(data.grandTotal),
        notes:             data.notes ?? null,
        termsAndConditions: data.termsAndConditions ?? null,
        contactPerson:     data.contactPerson ?? null,
        phone:             data.phone ?? null,
        email:             data.email ?? null,
        address:           data.address ?? null,
        country:           data.country ?? null,
        items: {
          create: data.items.map((item, idx) => ({
            productId:       item.productId ?? null,
            description:     item.description ?? null,
            productNameAr:   item.productNameAr ?? null,
            countryOfOrigin: item.countryOfOrigin ?? null,
            quantity:        new Prisma.Decimal(item.quantity),
            unitPrice:       new Prisma.Decimal(item.unitPrice),
            amount:          new Prisma.Decimal(item.amount),
            sortOrder:       item.sortOrder ?? idx,
          })),
        },
      },
      select: quotationSelect,
    });
    return serializeQuotation(row);
  },

  // ── Update (within transaction) ──────────────────────────────────────────
  async update(tx: Prisma.TransactionClient, id: string, data: UpdateQuotationData) {
    if (data.items) {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
    }

    const updateData: Prisma.QuotationUncheckedUpdateInput = {};
    if (data.customerId)        updateData.customerId = data.customerId;
    if (data.salespersonId !== undefined) updateData.salespersonId = data.salespersonId;
    if (data.quotationDate)     updateData.quotationDate = data.quotationDate;
    if (data.validityDate !== undefined)  updateData.validityDate = data.validityDate;
    if (data.referenceNumber !== undefined)   updateData.referenceNumber = data.referenceNumber;
    if (data.customerReference !== undefined) updateData.customerReference = data.customerReference;
    if (data.totalAmount)  updateData.totalAmount = new Prisma.Decimal(data.totalAmount);
    if (data.discount)     updateData.discount = new Prisma.Decimal(data.discount);
    if (data.roundOff !== undefined) updateData.roundOff = new Prisma.Decimal(data.roundOff);
    if (data.grandTotal)   updateData.grandTotal = new Prisma.Decimal(data.grandTotal);
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.termsAndConditions !== undefined) updateData.termsAndConditions = data.termsAndConditions ?? null;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson ?? null;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.email !== undefined) updateData.email = data.email ?? null;
    if (data.address !== undefined) updateData.address = data.address ?? null;
    if (data.country !== undefined) updateData.country = data.country ?? null;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.items) {
      updateData.items = {
        create: data.items.map((item, idx) => ({
          productId:       item.productId ?? null,
          description:     item.description ?? null,
          productNameAr:   item.productNameAr ?? null,
          countryOfOrigin: item.countryOfOrigin ?? null,
          quantity:        new Prisma.Decimal(item.quantity),
          unitPrice:       new Prisma.Decimal(item.unitPrice),
          amount:          new Prisma.Decimal(item.amount),
          sortOrder:       item.sortOrder ?? idx,
        })),
      };
    }

    const row = await tx.quotation.update({
      where: { id },
      data: updateData,
      select: quotationSelect,
    });
    return serializeQuotation(row);
  },

  // ── Status update ────────────────────────────────────────────────────────
  async updateStatus(tx: Prisma.TransactionClient, id: string, status: QuotationStatus) {
    const row = await tx.quotation.update({
      where: { id },
      data: { status },
      select: quotationSelect,
    });
    return serializeQuotation(row);
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  async delete(tx: Prisma.TransactionClient, id: string) {
    await tx.quotation.delete({ where: { id } });
  },

  // ── Statistics ───────────────────────────────────────────────────────────
  async getStatistics() {
    const [total, draft, sent, accepted, rejected, expired, cancelled, converted, amountAgg] = await Promise.all([
      prisma.quotation.count(),
      prisma.quotation.count({ where: { status: 'DRAFT' } }),
      prisma.quotation.count({ where: { status: 'SENT' } }),
      prisma.quotation.count({ where: { status: 'ACCEPTED' } }),
      prisma.quotation.count({ where: { status: 'REJECTED' } }),
      prisma.quotation.count({ where: { status: 'EXPIRED' } }),
      prisma.quotation.count({ where: { status: 'CANCELLED' } }),
      prisma.quotation.count({ where: { status: 'CONVERTED' } }),
      prisma.quotation.aggregate({
        _sum: { grandTotal: true },
        where: { status: { in: ['SENT', 'ACCEPTED', 'CONVERTED'] } },
      }),
    ]);

    return {
      total,
      draft,
      sent,
      accepted,
      rejected,
      expired,
      cancelled,
      converted,
      totalAmount: amountAgg._sum.grandTotal?.toFixed(3) ?? '0.000',
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0',
    };
  },
};

// ─── Serialization Helpers ────────────────────────────────────────────────────

type RawQuotation = Prisma.QuotationGetPayload<{ select: typeof quotationSelect }>;
type RawQuotationList = Prisma.QuotationGetPayload<{ select: typeof quotationListSelect }>;

function serializeQuotation(row: RawQuotation) {
  return {
    ...row,
    totalAmount: row.totalAmount.toFixed(3),
    discount: row.discount.toFixed(3),
    roundOff: row.roundOff.toFixed(3),
    grandTotal: row.grandTotal.toFixed(3),
    quotationDate: row.quotationDate.toISOString(),
    validityDate: row.validityDate?.toISOString() ?? null,
    convertedAt: row.convertedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(item => ({
      ...item,
      quantity: item.quantity.toFixed(3),
      unitPrice: item.unitPrice.toFixed(3),
      amount: item.amount.toFixed(3),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

function serializeQuotationList(row: RawQuotationList) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    grandTotal: rest.grandTotal.toFixed(3),
    quotationDate: rest.quotationDate.toISOString(),
    validityDate: rest.validityDate?.toISOString() ?? null,
    createdAt: rest.createdAt.toISOString(),
    updatedAt: rest.updatedAt.toISOString(),
    itemCount: _count.items,
  };
}
