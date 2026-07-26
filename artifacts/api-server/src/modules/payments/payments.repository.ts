import { Prisma, TransactionStatus, PaymentType, PaymentMethod } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface PaymentFilters {
  search?: string;
  status?: TransactionStatus;
  type?: PaymentType;
  method?: PaymentMethod;
  customerId?: string;
  supplierId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const paymentSelect = {
  id: true,
  number: true,
  type: true,
  method: true,
  mode: true,
  status: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  supplierId: true,
  supplier: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  amount: true,
  allocatedAmount: true,
  remainingAmount: true,
  paymentDate: true,
  referenceNumber: true,
  notes: true,
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  cancelledById: true,
  cancelledBy: {
    select: { id: true, name: true, nameAr: true },
  },
  cancelledAt: true,
  allocations: {
    select: {
      id: true,
      amount: true,
      sale: { select: { id: true, number: true } },
      purchase: { select: { id: true, number: true } },
      allocatedAt: true,
      allocatedBy: { select: { id: true, name: true } },
    }
  },
  attachments: {
    where: { deletedAt: null },
    select: {
      id: true,
      category: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    }
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

const paymentListSelect = {
  id: true,
  number: true,
  type: true,
  method: true,
  mode: true,
  status: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  supplierId: true,
  supplier: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  amount: true,
  allocatedAmount: true,
  remainingAmount: true,
  paymentDate: true,
  referenceNumber: true,
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

export const PaymentsRepository = {
  async findAll(filters: PaymentFilters = {}) {
    const {
      search,
      status,
      type,
      method,
      customerId,
      supplierId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.PaymentWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { referenceNumber: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
      // Special case: if the search resembles an invoice number (INV- or PO-)
      if (q.toUpperCase().startsWith('INV-') || q.toUpperCase().startsWith('PO-')) {
        where.OR.push({
          allocations: {
            some: {
              OR: [
                { sale: { number: { contains: q, mode: 'insensitive' } } },
                { purchase: { number: { contains: q, mode: 'insensitive' } } },
              ],
            },
          },
        });
      }
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (method) where.method = method;
    if (customerId) where.customerId = customerId;
    if (supplierId) where.supplierId = supplierId;

    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: paymentListSelect,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      items: items.map(serializePaymentList),
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    };
  },

  async findById(id: string) {
    const row = await prisma.payment.findUnique({
      where: { id },
      select: paymentSelect,
    });
    if (!row) return null;
    return serializePayment(row);
  },

  async create(tx: Prisma.TransactionClient, data: Prisma.PaymentUncheckedCreateInput) {
    const row = await tx.payment.create({
      data,
      select: paymentSelect,
    });
    return serializePayment(row);
  },

  async updateStatus(
    tx: Prisma.TransactionClient,
    id: string,
    data: { status: TransactionStatus; cancelledById?: string; cancelledAt?: Date }
  ) {
    const row = await tx.payment.update({
      where: { id },
      data,
      select: paymentSelect,
    });
    return serializePayment(row);
  },

  async delete(id: string) {
    await prisma.payment.delete({ where: { id } });
  },

  async getStatistics() {
    const [total, pending, completed, cancelled, customerAgg, supplierAgg] = await Promise.all([
      prisma.payment.count(),
      prisma.payment.count({ where: { status: 'PENDING' } }),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'CANCELLED' } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { type: 'CUSTOMER', status: 'COMPLETED' },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { type: 'SUPPLIER', status: 'COMPLETED' },
      }),
    ]);

    return {
      total,
      pending,
      completed,
      cancelled,
      totalCustomerAmount: (customerAgg._sum.amount ?? new Prisma.Decimal('0')).toFixed(3),
      totalSupplierAmount: (supplierAgg._sum.amount ?? new Prisma.Decimal('0')).toFixed(3),
    };
  }
};

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;
type PaymentListRow = Prisma.PaymentGetPayload<{ select: typeof paymentListSelect }>;

function serializePayment(row: NonNullable<PaymentRow>) {
  return {
    ...row,
    amount: row.amount.toFixed(3),
    allocatedAmount: row.allocatedAmount.toFixed(3),
    remainingAmount: row.remainingAmount.toFixed(3),
    allocations: row.allocations.map(a => ({
      ...a,
      amount: a.amount.toFixed(3),
    })),
  };
}

function serializePaymentList(row: PaymentListRow) {
  return {
    ...row,
    amount: row.amount.toFixed(3),
    allocatedAmount: row.allocatedAmount.toFixed(3),
    remainingAmount: row.remainingAmount.toFixed(3),
  };
}
