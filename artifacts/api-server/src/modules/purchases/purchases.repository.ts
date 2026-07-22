import { prisma } from '../../lib/prisma.js';
import { Prisma, PurchaseStatus } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseFilters {
  search?: string;
  status?: PurchaseStatus;
  supplierId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'number' | 'purchaseDate' | 'totalAmount' | 'netAmount' | 'createdAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePurchaseItemData {
  productId: string;
  quantity: string;
  unitPrice: string;
  total: string;
}

export interface CreatePurchaseData {
  number: string;
  supplierId: string;
  userId: string;
  status: PurchaseStatus;
  purchaseDate: Date;
  totalAmount: string;
  discount: string;
  tax: string;
  netAmount: string;
  notes?: string | null;
  items: CreatePurchaseItemData[];
}

export interface UpdatePurchaseData {
  supplierId?: string;
  purchaseDate?: Date;
  totalAmount?: string;
  discount?: string;
  tax?: string;
  netAmount?: string;
  notes?: string | null;
  items?: CreatePurchaseItemData[];
}

// ─── Select definitions ──────────────────────────────────────────────────────

const purchaseSelect = {
  id: true,
  number: true,
  supplierId: true,
  supplier: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  purchaseDate: true,
  totalAmount: true,
  discount: true,
  tax: true,
  netAmount: true,
  notes: true,
  paidAmount: true,
  outstandingAmount: true,
  paymentStatus: true,
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
} satisfies Prisma.PurchaseSelect;

const purchaseListSelect = {
  id: true,
  number: true,
  supplierId: true,
  supplier: {
    select: { id: true, name: true, nameAr: true, code: true },
  },
  userId: true,
  user: {
    select: { id: true, name: true, nameAr: true },
  },
  status: true,
  purchaseDate: true,
  totalAmount: true,
  discount: true,
  tax: true,
  netAmount: true,
  notes: true,
  paidAmount: true,
  outstandingAmount: true,
  paymentStatus: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { items: true } },
} satisfies Prisma.PurchaseSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const PurchasesRepository = {
  // ── List with search / filter / sort / pagination ────────────────────────
  async findAll(filters: PurchaseFilters = {}) {
    const {
      search,
      status,
      supplierId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.PurchaseWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { number: { contains: q, mode: 'insensitive' } },
        { supplier: { name: { contains: q, mode: 'insensitive' } } },
        { supplier: { nameAr: { contains: q, mode: 'insensitive' } } },
        { supplier: { code: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    const orderByMap: Record<string, Prisma.PurchaseOrderByWithRelationInput> = {
      number:       { number: sortOrder },
      purchaseDate: { purchaseDate: sortOrder },
      totalAmount:  { totalAmount: sortOrder },
      netAmount:    { netAmount: sortOrder },
      createdAt:    { createdAt: sortOrder },
      status:       { status: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.purchase.count({ where }),
      prisma.purchase.findMany({ where, select: purchaseListSelect, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializePurchaseList),
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
    const row = await prisma.purchase.findUnique({ where: { id }, select: purchaseSelect });
    return row ? serializePurchase(row) : null;
  },

  // ── Create (within transaction) ──────────────────────────────────────────
  async create(tx: Prisma.TransactionClient, data: CreatePurchaseData) {
    const row = await tx.purchase.create({
      data: {
        number:       data.number,
        supplierId:   data.supplierId,
        userId:       data.userId,
        status:       data.status,
        purchaseDate: data.purchaseDate,
        totalAmount:  new Prisma.Decimal(data.totalAmount),
        discount:     new Prisma.Decimal(data.discount),
        tax:          new Prisma.Decimal(data.tax),
        netAmount:    new Prisma.Decimal(data.netAmount),
        notes:        data.notes ?? null,
        items: {
          create: data.items.map(item => ({
            productId: item.productId,
            quantity:  new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            total:     new Prisma.Decimal(item.total),
          })),
        },
      },
      select: purchaseSelect,
    });
    return serializePurchase(row);
  },

  // ── Update (within transaction) ──────────────────────────────────────────
  async update(tx: Prisma.TransactionClient, id: string, data: UpdatePurchaseData) {
    // If items are provided, delete old items and recreate
    if (data.items) {
      await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
    }

    const row = await tx.purchase.update({
      where: { id },
      data: {
        ...(data.supplierId   !== undefined && { supplierId:   data.supplierId }),
        ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate }),
        ...(data.totalAmount  !== undefined && { totalAmount:  new Prisma.Decimal(data.totalAmount) }),
        ...(data.discount     !== undefined && { discount:     new Prisma.Decimal(data.discount) }),
        ...(data.tax          !== undefined && { tax:          new Prisma.Decimal(data.tax) }),
        ...(data.netAmount    !== undefined && { netAmount:    new Prisma.Decimal(data.netAmount) }),
        ...(data.notes        !== undefined && { notes:        data.notes }),
        ...(data.items && {
          items: {
            create: data.items.map(item => ({
              productId: item.productId,
              quantity:  new Prisma.Decimal(item.quantity),
              unitPrice: new Prisma.Decimal(item.unitPrice),
              total:     new Prisma.Decimal(item.total),
            })),
          },
        }),
      },
      select: purchaseSelect,
    });
    return serializePurchase(row);
  },

  // ── Update status only ───────────────────────────────────────────────────
  async updateStatus(tx: Prisma.TransactionClient, id: string, status: PurchaseStatus) {
    const row = await tx.purchase.update({
      where: { id },
      data: { status },
      select: purchaseSelect,
    });
    return serializePurchase(row);
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  async delete(id: string) {
    await prisma.purchase.delete({ where: { id } });
  },

  // ── Get raw purchase with items (for service calculations) ───────────────
  async findRawById(tx: Prisma.TransactionClient, id: string) {
    return tx.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
  },

  // ── Auto-generate purchase number ────────────────────────────────────────
  async generateNumber(tx: Prisma.TransactionClient): Promise<string> {
    const last = await tx.purchase.findFirst({
      where: { number: { startsWith: 'PUR-' } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });

    let next = 1;
    if (last) {
      const num = parseInt(last.number.replace('PUR-', ''), 10);
      if (!isNaN(num)) next = num + 1;
    }

    return `PUR-${String(next).padStart(6, '0')}`;
  },

  // ── Statistics ───────────────────────────────────────────────────────────
  async getStatistics() {
    const [total, draft, confirmed, received, cancelled, totalAmountAgg] = await Promise.all([
      prisma.purchase.count(),
      prisma.purchase.count({ where: { status: 'DRAFT' } }),
      prisma.purchase.count({ where: { status: 'CONFIRMED' } }),
      prisma.purchase.count({ where: { status: 'RECEIVED' } }),
      prisma.purchase.count({ where: { status: 'CANCELLED' } }),
      prisma.purchase.aggregate({
        _sum: { netAmount: true },
        where: { status: { not: 'CANCELLED' } },
      }),
    ]);

    return {
      total,
      draft,
      confirmed,
      received,
      cancelled,
      totalAmount: (totalAmountAgg._sum.netAmount ?? new Prisma.Decimal('0')).toFixed(3),
    };
  },
};

// ─── Serializers (Decimal → string, Date → ISO) ──────────────────────────────

type PurchaseListRow = Prisma.PurchaseGetPayload<{ select: typeof purchaseListSelect }>;

function serializePurchaseList(row: PurchaseListRow) {
  return {
    id:           row.id,
    number:       row.number,
    supplierId:   row.supplierId,
    supplier:     row.supplier,
    userId:       row.userId,
    user:         row.user,
    status:       row.status,
    purchaseDate: row.purchaseDate.toISOString(),
    totalAmount:  row.totalAmount.toFixed(3),
    discount:     row.discount.toFixed(3),
    tax:          row.tax.toFixed(3),
    netAmount:    row.netAmount.toFixed(3),
    notes:        row.notes,
    paidAmount:   row.paidAmount.toFixed(3),
    outstandingAmount: row.outstandingAmount.toFixed(3),
    paymentStatus: row.paymentStatus,
    itemCount:    row._count.items,
    createdAt:    row.createdAt.toISOString(),
    updatedAt:    row.updatedAt.toISOString(),
  };
}

type PurchaseRow = Prisma.PurchaseGetPayload<{ select: typeof purchaseSelect }>;

function serializePurchase(row: NonNullable<PurchaseRow>) {
  return {
    id:           row.id,
    number:       row.number,
    supplierId:   row.supplierId,
    supplier:     row.supplier,
    userId:       row.userId,
    user:         row.user,
    status:       row.status,
    purchaseDate: row.purchaseDate.toISOString(),
    totalAmount:  row.totalAmount.toFixed(3),
    discount:     row.discount.toFixed(3),
    tax:          row.tax.toFixed(3),
    netAmount:    row.netAmount.toFixed(3),
    notes:        row.notes,
    paidAmount:   row.paidAmount.toFixed(3),
    outstandingAmount: row.outstandingAmount.toFixed(3),
    paymentStatus: row.paymentStatus,
    items: row.items.map(item => ({
      id:        item.id,
      productId: item.productId,
      product:   item.product,
      quantity:  item.quantity.toFixed(3),
      unitPrice: item.unitPrice.toFixed(3),
      total:     item.total.toFixed(3),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    createdAt:    row.createdAt.toISOString(),
    updatedAt:    row.updatedAt.toISOString(),
  };
}
