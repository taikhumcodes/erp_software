import { prisma } from '../../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UnitRow {
  id: string;
  name: string;
  nameAr: string | null;
  abbreviation: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListUnitsOptions {
  search?: string;
  page: number;
  limit: number;
  active?: boolean;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class UnitsRepository {
  async findAll(opts: ListUnitsOptions): Promise<{ data: UnitRow[]; total: number }> {
    const { search, page, limit, active } = opts;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { nameAr: { contains: search, mode: 'insensitive' as const } },
              { abbreviation: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(active !== undefined ? { isActive: active } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.unit.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.unit.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<UnitRow | null> {
    return prisma.unit.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<UnitRow | null> {
    return prisma.unit.findUnique({ where: { name } });
  }

  async create(data: {
    name: string;
    nameAr?: string | null;
    abbreviation: string;
  }): Promise<UnitRow> {
    return prisma.unit.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      nameAr?: string | null;
      abbreviation?: string;
      isActive?: boolean;
    },
  ): Promise<UnitRow> {
    return prisma.unit.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.unit.delete({ where: { id } });
  }

  async countProducts(unitId: string): Promise<number> {
    return prisma.product.count({ where: { unitId } });
  }
}

export const unitsRepository = new UnitsRepository();
