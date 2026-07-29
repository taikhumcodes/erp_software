import { prisma } from '../../lib/prisma.js';
import { Prisma, SaleStatus, PaymentMethod } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SaleFilters {
  search?: string;
  status?: SaleStatus;
  customerId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'number' | 'saleDate' | 'totalAmount' | 'netAmount' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSaleItemData {
  productId: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface CreateSaleData {
  number: string;
  internalSONumber: string;
  customerPONumber?: string | null;
  deliveryOrderId?: string | null;
  orderSource?: any; // OrderSource enum
  customerId: string;
  userId: string;
  status: SaleStatus;
  saleDate: Date;
  totalAmount: string;
  discount: string;
  netAmount: string;
  notes?: string | null;
  paymentMethod?: PaymentMethod | null;
  items: CreateSaleItemData[];
}

export interface UpdateSaleData {
  customerId?: string;
  saleDate?: Date;
  totalAmount?: string;
  discount?: string;
  netAmount?: string;
  notes?: string | null;
  paymentMethod?: PaymentMethod | null;
  items?: CreateSaleItemData[];
}

// ─── Select definitions ──────────────────────────────────────────────────────

const saleSelect = {
  id: true,
  number: true,
  internalSONumber: true,
  customerPONumber: true,
  deliveryOrderId: true,
  deliveryOrder: { select: { number: true } },
  orderSource: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  saleDate: true,
  totalAmount: true,
  discount: true,
  netAmount: true,
  notes: true,
  paidAmount: true,
  outstandingAmount: true,
  paymentStatus: true,
  paymentMethod: true,
  allocations: {
    select: {
      payment: {
        select: {
          method: true,
        },
      },
    },
  },
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
          unit: { select: { id: true, name: true, nameAr: true, abbreviation: true } },
        },
      },
      quantity: true,
      unitPrice: true,
      total: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SaleSelect;

const saleListSelect = {
  id: true,
  number: true,
  internalSONumber: true,
  customerPONumber: true,
  deliveryOrderId: true,
  deliveryOrder: { select: { number: true } },
  orderSource: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  saleDate: true,
  totalAmount: true,
  discount: true,
  netAmount: true,
  notes: true,
  paidAmount: true,
  outstandingAmount: true,
  paymentStatus: true,
  paymentMethod: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.SaleSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const SalesRepository = {
  // ── List with search / filter / sort / pagination ────────────────────────
  async findAll(filters: SaleFilters = {}) {
    const {
      search,
      status,
      customerId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.SaleWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { internalSONumber: { contains: q, mode: 'insensitive' } },
        { customerPONumber: { contains: q, mode: 'insensitive' } },
        { deliveryOrder: { number: { contains: q, mode: 'insensitive' } } },
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

    const orderByMap: Record<string, Prisma.SaleOrderByWithRelationInput> = {
      number:       { number: sortOrder },
      saleDate:     { saleDate: sortOrder },
      totalAmount:  { totalAmount: sortOrder },
      netAmount:    { netAmount: sortOrder },
      createdAt:    { createdAt: sortOrder },
      status:       { status: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({ where, select: saleListSelect, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializeSaleList),
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
    const row = await prisma.sale.findUnique({ where: { id }, select: saleSelect });
    return row ? serializeSale(row) : null;
  },

  // ── Create (within transaction) ──────────────────────────────────────────
  async create(tx: Prisma.TransactionClient, data: CreateSaleData) {
    const row = await tx.sale.create({
      data: {
        number:           data.number,
        internalSONumber: data.internalSONumber,
        customerPONumber: data.customerPONumber ?? null,
        deliveryOrderId:  data.deliveryOrderId ?? null,
        orderSource:      data.orderSource,
        customerId:       data.customerId,
        userId:       data.userId,
        status:       data.status,
        saleDate:     data.saleDate,
        totalAmount:  new Prisma.Decimal(data.totalAmount),
        discount:     new Prisma.Decimal(data.discount),
        netAmount:    new Prisma.Decimal(data.netAmount),
        notes:        data.notes ?? null,
        paymentMethod: data.paymentMethod ?? null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity:  new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            total:     new Prisma.Decimal(item.total),
          })),
        },
      },
      select: saleSelect,
    });
    return serializeSale(row);
  },

  // ── Update (within transaction) ──────────────────────────────────────────
  async update(tx: Prisma.TransactionClient, id: string, data: UpdateSaleData) {
    // 1. If items are provided, delete old ones
    if (data.items) {
      await tx.saleItem.deleteMany({ where: { saleId: id } });
    }

    // 2. Build update payload
    const updateData: Prisma.SaleUncheckedUpdateInput = {};
    if (data.customerId) updateData.customerId = data.customerId;
    if (data.saleDate)   updateData.saleDate = data.saleDate;
    if (data.totalAmount) updateData.totalAmount = new Prisma.Decimal(data.totalAmount);
    if (data.discount)    updateData.discount = new Prisma.Decimal(data.discount);
    if (data.netAmount)   updateData.netAmount = new Prisma.Decimal(data.netAmount);
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    
    if (data.items) {
      updateData.items = {
        create: data.items.map(item => ({
          productId: item.productId,
          quantity:  new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          total:     new Prisma.Decimal(item.total),
        })),
      };
    }

    const row = await tx.sale.update({
      where: { id },
      data: updateData,
      select: saleSelect,
    });
    return serializeSale(row);
  },

  // ── Status update ────────────────────────────────────────────────────────
  async updateStatus(tx: Prisma.TransactionClient, id: string, status: SaleStatus) {
    const row = await tx.sale.update({
      where: { id },
      data: { status },
      select: saleSelect,
    });
    return serializeSale(row);
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  async delete(tx: Prisma.TransactionClient, id: string) {
    await tx.sale.delete({ where: { id } });
  },

  // ── Check existence ──────────────────────────────────────────────────────
  async exists(id: string) {
    const count = await prisma.sale.count({ where: { id } });
    return count > 0;
  },
};

// ─── Serialization Helpers (to avoid leaking Prisma.Decimal to the frontend)

// Explicitly type the input for serialization using the return types of our selects
type RawSale = Prisma.SaleGetPayload<{ select: typeof saleSelect }>;
type RawSaleList = Prisma.SaleGetPayload<{ select: typeof saleListSelect }>;

function serializeSale(row: RawSale) {
  return {
    ...row,
    totalAmount: row.totalAmount.toFixed(3),
    discount: row.discount.toFixed(3),
    netAmount: row.netAmount.toFixed(3),
    paidAmount: row.paidAmount.toFixed(3),
    outstandingAmount: row.outstandingAmount.toFixed(3),
    paymentMethod: row.allocations?.[0]?.payment?.method || null,
    items: row.items.map(item => ({
      ...item,
      quantity: item.quantity.toFixed(3),
      unitPrice: item.unitPrice.toFixed(3),
      total: item.total.toFixed(3),
    })),
  };
}

function serializeSaleList(row: RawSaleList) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    totalAmount: rest.totalAmount.toFixed(3),
    discount: rest.discount.toFixed(3),
    netAmount: rest.netAmount.toFixed(3),
    paidAmount: rest.paidAmount.toFixed(3),
    outstandingAmount: rest.outstandingAmount.toFixed(3),
    itemCount: _count.items,
  };
}
