import { prisma } from '../../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandRow {
  id: string;
  name: string;
  nameAr: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListBrandsOptions {
  search?: string;
  page: number;
  limit: number;
  active?: boolean;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class BrandsRepository {
  async findAll(opts: ListBrandsOptions): Promise<{ data: BrandRow[]; total: number }> {
    const { search, page, limit, active } = opts;

    const where = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { nameAr: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(active !== undefined ? { isActive: active } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.brand.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<BrandRow | null> {
    return prisma.brand.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<BrandRow | null> {
    return prisma.brand.findUnique({ where: { name } });
  }

  async create(data: {
    name: string;
    nameAr?: string | null;
    logoUrl?: string | null;
  }): Promise<BrandRow> {
    return prisma.brand.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      nameAr?: string | null;
      logoUrl?: string | null;
      isActive?: boolean;
    },
  ): Promise<BrandRow> {
    return prisma.brand.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.brand.delete({ where: { id } });
  }

  async countProducts(brandId: string): Promise<number> {
    return prisma.product.count({ where: { brandId } });
  }
}

export const brandsRepository = new BrandsRepository();
