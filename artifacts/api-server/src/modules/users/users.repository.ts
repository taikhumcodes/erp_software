import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'email' | 'role' | 'createdAt' | 'lastLogin' | 'isActive';
  sortOrder?: 'asc' | 'desc';
}

// ─── Field selection — password is NEVER selected ─────────────────────────────

const select = {
  id:        true,
  email:     true,
  name:      true,
  nameAr:    true,
  role:      { select: { name: true } },
  isActive:  true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

// ─── Serializer ───────────────────────────────────────────────────────────────

type UserRow = {
  id: string;
  email: string;
  name: string;
  nameAr: string | null;
  role: { name: string };
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function serializeUser(row: UserRow) {
  return {
    id:        row.id,
    email:     row.email,
    name:      row.name,
    nameAr:    row.nameAr,
    role:      row.role.name as UserRole,
    isActive:  row.isActive,
    lastLogin: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const UsersRepository = {
  // ── List with search / filter / sort / pagination ──────────────────────────
  async findAll(filters: UserFilters = {}) {
    const {
      search,
      role,
      isActive,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.UserWhereInput = {};

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name:   { contains: q, mode: 'insensitive' } },
        { nameAr: { contains: q, mode: 'insensitive' } },
        { email:  { contains: q, mode: 'insensitive' } },
        { role:   { name: { equals: q.toUpperCase() as UserRole } } },
      ];
    }

    if (role) {
      where.role = { name: role };
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    const orderByMap: Record<string, Prisma.UserOrderByWithRelationInput> = {
      name:      { name: sortOrder },
      email:     { email: sortOrder },
      role:      { role: { name: sortOrder } },
      createdAt: { createdAt: sortOrder },
      lastLogin: { lastLoginAt: sortOrder },
      isActive:  { isActive: sortOrder },
    };
    const orderBy = orderByMap[sortBy] ?? { createdAt: 'desc' };

    const skip = (page - 1) * limit;

    const [total, rows] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select, orderBy, skip, take: limit }),
    ]);

    return {
      data: rows.map(serializeUser),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },

  // ── Single (no password) ──────────────────────────────────────────────────
  async findById(id: string) {
    const row = await prisma.user.findUnique({ where: { id }, select });
    return row ? serializeUser(row) : null;
  },

  // ── Email lookup (used for uniqueness checks) — no password ───────────────
  async findByEmail(email: string, excludeId?: string) {
    return prisma.user.findFirst({
      where: {
        email: { equals: email.trim().toLowerCase(), mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
  },

  // ── Fetch with password hash (auth / password reset only) ─────────────────
  async findByIdWithPassword(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { ...select, passwordHash: true },
    });
  },

  // ── Count active OWNERs (owner protection guard) ──────────────────────────
  async countActiveOwners(): Promise<number> {
    return prisma.user.count({ where: { role: { name: 'OWNER' }, isActive: true } });
  },

  // ── Create ────────────────────────────────────────────────────────────────
  async create(data: {
    email: string;
    password: string;   // already hashed
    name: string;
    nameAr?: string | null;
    role: UserRole;
    isActive?: boolean;
  }) {
    const row = await prisma.user.create({
      data: {
        email:        data.email.trim().toLowerCase(),
        passwordHash: data.password,
        name:         data.name,
        nameAr:       data.nameAr  ?? null,
        role:         { connect: { name: data.role } },
        isActive:     data.isActive ?? true,
      },
      select,
    });
    return serializeUser(row);
  },

  // ── Update profile fields ─────────────────────────────────────────────────
  async update(
    id: string,
    data: {
      name?: string;
      nameAr?: string | null;
      role?: UserRole;
      isActive?: boolean;
    },
  ) {
    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name     !== undefined && { name:     data.name }),
        ...(data.nameAr   !== undefined && { nameAr:   data.nameAr }),
        ...(data.role     !== undefined && { role:     { connect: { name: data.role } } }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select,
    });
    return serializeUser(row);
  },

  // ── Toggle status only ────────────────────────────────────────────────────
  async updateStatus(id: string, isActive: boolean) {
    const row = await prisma.user.update({
      where: { id },
      data: { isActive },
      select,
    });
    return serializeUser(row);
  },

  // ── Update hashed password ────────────────────────────────────────────────
  async updatePassword(id: string, hashedPassword: string) {
    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  async delete(id: string) {
    await prisma.user.delete({ where: { id } });
  },

  // ── Statistics ────────────────────────────────────────────────────────────
  async getStatistics() {
    const ROLES: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

    const [total, active, inactive, ...roleCounts] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      ...ROLES.map(r => prisma.user.count({ where: { role: { name: r } } })),
    ]);

    const byRole: Record<string, number> = {};
    ROLES.forEach((r, i) => { byRole[r] = roleCounts[i]!; });

    return { total, active, inactive, byRole };
  },
};
