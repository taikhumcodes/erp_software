import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'code' | 'balance' | 'createdAt' | 'isActive';
  sortOrder?: 'asc' | 'desc';
}

// ─── Field selection (all public fields) ─────────────────────────────────────

const select = {
  id: true,
  code: true,
  name: true,
  nameAr: true,
  phone: true,
  email: true,
  address: true,
  balance: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

// ─── Repository ───────────────────────────────────────────────────────────────

export const SuppliersRepository = {
  // ── List with search / filter / sort / pagination ──────────────────────────
  async findAll(filters: SupplierFilters = {}) {
    const {
      search,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.SupplierWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { code:   { contains: q, mode: 'insensitive' } },
        { name:   { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { phone:  { contains: q, mode: 'insensitive' } },
        { email:  { contains: q, mode: 'insensitive' } },
      ];
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const orderByMap: Record<string, Prisma.SupplierOrderByWithRelationInput> = {
      name:      { name: sortOrder },
      code:      { code: sortOrder },
      balance:   { balance: sortOrder },
      createdAt: { createdAt: sortOrder },
      isActive:  { isActive: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.supplier.count({ where }),
      prisma.supplier.findMany({ where, select, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializeSupplier),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  // ── Single ────────────────────────────────────────────────────────────────
  async findById(id: string) {
    const row = await prisma.supplier.findUnique({ where: { id }, select });
    return row ? serializeSupplier(row) : null;
  },

  // ── Duplicate checks ──────────────────────────────────────────────────────
  async findByName(name: string, excludeId?: string) {
    return prisma.supplier.findFirst({
      where: {
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  async findByEmail(email: string, excludeId?: string) {
    return prisma.supplier.findFirst({
      where: {
        email: { equals: email.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  async findByPhone(phone: string, excludeId?: string) {
    return prisma.supplier.findFirst({
      where: {
        phone: { equals: phone.trim(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  // ── Auto-generate supplier code (transactional, safe under concurrency) ───
  async generateCode(): Promise<string> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const last = await tx.supplier.findFirst({
        where: { code: { startsWith: 'SUP-' } },
        orderBy: { code: 'desc' },
        select: { code: true },
      });

      let next = 1;
      if (last) {
        const num = parseInt(last.code.replace('SUP-', ''), 10);
        if (!isNaN(num)) next = num + 1;
      }

      return `SUP-${String(next).padStart(6, '0')}`;
    });
  },

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data: {
    code: string;
    name: string;
    nameAr?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    balance?: string;
    isActive?: boolean;
  }) {
    const row = await prisma.supplier.create({
      data: {
        code:     data.code,
        name:     data.name,
        nameAr:   data.nameAr  ?? null,
        phone:    data.phone   ?? null,
        email:    data.email   ?? null,
        address:  data.address ?? null,
        balance:  new Prisma.Decimal(data.balance ?? '0'),
        isActive: data.isActive ?? true,
      },
      select,
    });
    return serializeSupplier(row);
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async update(
    id: string,
    data: {
      name?: string;
      nameAr?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      balance?: string;
      isActive?: boolean;
    },
  ) {
    const row = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name     !== undefined && { name:     data.name }),
        ...(data.nameAr   !== undefined && { nameAr:   data.nameAr }),
        ...(data.phone    !== undefined && { phone:    data.phone }),
        ...(data.email    !== undefined && { email:    data.email }),
        ...(data.address  !== undefined && { address:  data.address }),
        ...(data.balance  !== undefined && { balance:  new Prisma.Decimal(data.balance) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select,
    });
    return serializeSupplier(row);
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  async delete(id: string) {
    await prisma.supplier.delete({ where: { id } });
  },

  // ── Delete guards ─────────────────────────────────────────────────────────
  async hasPurchases(id: string): Promise<boolean> {
    const count = await prisma.purchase.count({ where: { supplierId: id } });
    return count > 0;
  },

  async hasPayments(id: string): Promise<boolean> {
    const count = await prisma.payment.count({ where: { supplierId: id } });
    return count > 0;
  },

  // ── Statistics ────────────────────────────────────────────────────────────
  async getStatistics() {
    const [total, active, inactive, balanceAgg] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { isActive: false } }),
      prisma.supplier.aggregate({ _sum: { balance: true } }),
    ]);

    return {
      total,
      active,
      inactive,
      totalBalance: (balanceAgg._sum.balance ?? new Prisma.Decimal('0')).toFixed(3),
    };
  },
};

// ─── Serializer (Decimal → string) ───────────────────────────────────────────

type SupplierRow = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function serializeSupplier(row: SupplierRow) {
  return {
    id:        row.id,
    code:      row.code,
    name:      row.name,
    nameAr:    row.nameAr,
    phone:     row.phone,
    email:     row.email,
    address:   row.address,
    balance:   row.balance.toFixed(3),
    isActive:  row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
