import { prisma } from '../../lib/prisma.js';
import { Prisma, DeliveryOrderStatus, InvoiceStatus, OrderSource, PaymentMethod } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeliveryOrderFilters {
  search?: string;
  status?: DeliveryOrderStatus;
  invoiceStatus?: InvoiceStatus;
  orderType?: OrderSource;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  createdById?: string;
  page?: number;
  limit?: number;
  sortBy?: 'number' | 'deliveryDate' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateDeliveryOrderItemData {
  productId: string;
  productNameSnapshot: string;
  productCodeSnapshot: string;
  unitSnapshot: string;
  quantity: string;
  remarks?: string | null;
}

export interface CreateDeliveryOrderData {
  number: string;
  internalSONumber: string;
  customerPONumber?: string | null;
  orderType: OrderSource;
  customerId: string;
  customerNameSnapshot: string;
  status: DeliveryOrderStatus;
  deliveryDate?: Date | null;
  deliveryAddress?: string | null;
  site?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  paymentMethod?: PaymentMethod | null;
  createdById: string;
  items: CreateDeliveryOrderItemData[];
}

export interface UpdateDeliveryOrderData {
  deliveryDate?: Date | null;
  deliveryAddress?: string | null;
  site?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
  notes?: string | null;
  internalNotes?: string | null;
  paymentMethod?: PaymentMethod | null;
  items?: CreateDeliveryOrderItemData[];
}

// ─── Select definitions ──────────────────────────────────────────────────────

const userBrief = { id: true, name: true, nameAr: true } as const;

const deliveryOrderSelect = {
  id: true,
  number: true,
  internalSONumber: true,
  customerPONumber: true,
  orderType: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true, address: true, phone: true },
  },
  customerNameSnapshot: true,
  status: true,
  invoiceStatus: true,
  paymentMethod: true,
  deliveryDate: true,
  deliveryAddress: true,
  site: true,
  contactPerson: true,
  contactNumber: true,
  driverName: true,
  vehicleNumber: true,
  notes: true,
  internalNotes: true,
  createdById: true,
  createdBy: { select: userBrief },
  approvedById: true,
  approvedBy: { select: userBrief },
  approvedAt: true,
  dispatchedById: true,
  dispatchedBy: { select: userBrief },
  dispatchedAt: true,
  deliveredById: true,
  deliveredBy: { select: userBrief },
  deliveredAt: true,
  cancelledById: true,
  cancelledBy: { select: userBrief },
  cancelledAt: true,
  cancelReason: true,
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
      productNameSnapshot: true,
      productCodeSnapshot: true,
      unitSnapshot: true,
      quantity: true,
      remarks: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
  history: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      userId: true,
      user: { select: userBrief },
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.DeliveryOrderSelect;

const deliveryOrderListSelect = {
  id: true,
  number: true,
  internalSONumber: true,
  customerPONumber: true,
  orderType: true,
  customerId: true,
  customer: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  customerNameSnapshot: true,
  status: true,
  invoiceStatus: true,
  paymentMethod: true,
  deliveryDate: true,
  deliveryAddress: true,
  site: true,
  createdById: true,
  createdBy: { select: userBrief },
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.DeliveryOrderSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const DeliveryOrdersRepository = {
  // ── List with search / filter / sort / pagination ────────────────────────
  async findAll(filters: DeliveryOrderFilters = {}) {
    const {
      search,
      status,
      invoiceStatus,
      orderType,
      customerId,
      dateFrom,
      dateTo,
      createdById,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.DeliveryOrderWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { internalSONumber: { contains: q, mode: 'insensitive' } },
        { customerPONumber: { contains: q, mode: 'insensitive' } },
        { customerNameSnapshot: { contains: q, mode: 'insensitive' } },
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { phone: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (status) where.status = status;
    if (invoiceStatus) where.invoiceStatus = invoiceStatus;
    if (orderType) where.orderType = orderType;
    if (customerId) where.customerId = customerId;
    if (createdById) where.createdById = createdById;

    if (dateFrom || dateTo) {
      where.deliveryDate = {};
      if (dateFrom) where.deliveryDate.gte = new Date(dateFrom);
      if (dateTo) where.deliveryDate.lte = new Date(dateTo);
    }

    const orderByMap: Record<string, Prisma.DeliveryOrderOrderByWithRelationInput> = {
      number:       { number: sortOrder },
      deliveryDate: { deliveryDate: sortOrder },
      createdAt:    { createdAt: sortOrder },
      status:       { status: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.deliveryOrder.count({ where }),
      prisma.deliveryOrder.findMany({ where, select: deliveryOrderListSelect, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializeDeliveryOrderList),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },

  // ── Single with items + history ──────────────────────────────────────────
  async findById(id: string) {
    const row = await prisma.deliveryOrder.findUnique({ where: { id }, select: deliveryOrderSelect });
    return row ? serializeDeliveryOrder(row) : null;
  },

  // ── Create (within transaction) ──────────────────────────────────────────
  async create(tx: Prisma.TransactionClient, data: CreateDeliveryOrderData) {
    const row = await tx.deliveryOrder.create({
      data: {
        number:               data.number,
        internalSONumber:     data.internalSONumber,
        customerPONumber:     data.customerPONumber,
        orderType:            data.orderType,
        customerId:           data.customerId,
        customerNameSnapshot: data.customerNameSnapshot,
        status:               data.status,
        deliveryDate:         data.deliveryDate ?? null,
        deliveryAddress:      data.deliveryAddress ?? null,
        site:                 data.site ?? null,
        contactPerson:        data.contactPerson ?? null,
        contactNumber:        data.contactNumber ?? null,
        driverName:           data.driverName ?? null,
        vehicleNumber:        data.vehicleNumber ?? null,
        notes:                data.notes ?? null,
        internalNotes:        data.internalNotes ?? null,
        paymentMethod:        data.paymentMethod ?? null,
        createdById:          data.createdById,
        items: {
          create: data.items.map(item => ({
            productId:           item.productId,
            productNameSnapshot: item.productNameSnapshot,
            productCodeSnapshot: item.productCodeSnapshot,
            unitSnapshot:        item.unitSnapshot,
            quantity:            new Prisma.Decimal(item.quantity),
            remarks:             item.remarks ?? null,
          })),
        },
        history: {
          create: {
            fromStatus: null,
            toStatus:   data.status,
            userId:     data.createdById,
            notes:      'Delivery Order created',
          },
        },
      },
      select: deliveryOrderSelect,
    });
    return serializeDeliveryOrder(row);
  },

  // ── Update (within transaction) ──────────────────────────────────────────
  async update(tx: Prisma.TransactionClient, id: string, data: UpdateDeliveryOrderData) {
    if (data.items) {
      await tx.deliveryOrderItem.deleteMany({ where: { deliveryOrderId: id } });
    }

    const updateData: Prisma.DeliveryOrderUncheckedUpdateInput = {};
    if (data.deliveryDate !== undefined) updateData.deliveryDate = data.deliveryDate ?? null;
    if (data.deliveryAddress !== undefined) updateData.deliveryAddress = data.deliveryAddress ?? null;
    if (data.site !== undefined) updateData.site = data.site ?? null;
    if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson ?? null;
    if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber ?? null;
    if (data.driverName !== undefined) updateData.driverName = data.driverName ?? null;
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber ?? null;
    if (data.notes !== undefined) updateData.notes = data.notes ?? null;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes ?? null;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod ?? null;

    if (data.items) {
      updateData.items = {
        create: data.items.map(item => ({
          productId:           item.productId,
          productNameSnapshot: item.productNameSnapshot,
          productCodeSnapshot: item.productCodeSnapshot,
          unitSnapshot:        item.unitSnapshot,
          quantity:            new Prisma.Decimal(item.quantity),
          remarks:             item.remarks ?? null,
        })),
      };
    }

    const row = await tx.deliveryOrder.update({
      where: { id },
      data: updateData,
      select: deliveryOrderSelect,
    });
    return serializeDeliveryOrder(row);
  },

  // ── Status update + audit ────────────────────────────────────────────────
  async updateStatus(
    tx: Prisma.TransactionClient,
    id: string,
    fromStatus: DeliveryOrderStatus,
    toStatus: DeliveryOrderStatus,
    userId: string,
    auditFields: Prisma.DeliveryOrderUncheckedUpdateInput,
    historyNotes?: string,
  ) {
    const row = await tx.deliveryOrder.update({
      where: { id },
      data: { status: toStatus, ...auditFields },
      select: deliveryOrderSelect,
    });

    await tx.deliveryOrderHistory.create({
      data: {
        deliveryOrderId: id,
        fromStatus,
        toStatus,
        userId,
        notes: historyNotes ?? `Status changed from ${fromStatus} to ${toStatus}`,
      },
    });

    return serializeDeliveryOrder(row);
  },

  // ── Invoice Status update ──────────────────────────────────────────────
  async updateInvoiceStatus(tx: Prisma.TransactionClient, id: string, invoiceStatus: InvoiceStatus) {
    const row = await tx.deliveryOrder.update({
      where: { id },
      data: { invoiceStatus },
      select: deliveryOrderSelect,
    });
    return serializeDeliveryOrder(row);
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  async delete(tx: Prisma.TransactionClient, id: string) {
    await tx.deliveryOrder.delete({ where: { id } });
  },

  // ── Statistics ───────────────────────────────────────────────────────────
  async getStatistics() {
    const [total, draft, approved, dispatched, delivered, cancelled] = await Promise.all([
      prisma.deliveryOrder.count(),
      prisma.deliveryOrder.count({ where: { status: 'DRAFT' } }),
      prisma.deliveryOrder.count({ where: { status: 'APPROVED' } }),
      prisma.deliveryOrder.count({ where: { status: 'DISPATCHED' } }),
      prisma.deliveryOrder.count({ where: { status: 'DELIVERED' } }),
      prisma.deliveryOrder.count({ where: { status: 'CANCELLED' } }),
    ]);

    return { total, draft, approved, dispatched, delivered, cancelled };
  },

  // ── Check existence ──────────────────────────────────────────────────────
  async exists(id: string) {
    const count = await prisma.deliveryOrder.count({ where: { id } });
    return count > 0;
  },
};

// ─── Serialization Helpers ───────────────────────────────────────────────────

type RawDeliveryOrder = Prisma.DeliveryOrderGetPayload<{ select: typeof deliveryOrderSelect }>;
type RawDeliveryOrderList = Prisma.DeliveryOrderGetPayload<{ select: typeof deliveryOrderListSelect }>;

function serializeDeliveryOrder(row: RawDeliveryOrder) {
  return {
    ...row,
    items: row.items.map(item => ({
      ...item,
      quantity: item.quantity.toFixed(3),
    })),
  };
}

function serializeDeliveryOrderList(row: RawDeliveryOrderList) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    itemCount: _count.items,
  };
}
