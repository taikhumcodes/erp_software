import { prisma } from '../../lib/prisma.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CategoryRow {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListCategoriesOptions {
  search?: string;
  page: number;
  limit: number;
  active?: boolean;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class CategoriesRepository {
  async findAll(opts: ListCategoriesOptions): Promise<{ data: CategoryRow[]; total: number }> {
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
      prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.category.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<CategoryRow | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async findByName(name: string): Promise<CategoryRow | null> {
    return prisma.category.findUnique({ where: { name } });
  }

  async create(data: {
    name: string;
    nameAr?: string | null;
    description?: string | null;
  }): Promise<CategoryRow> {
    return prisma.category.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      nameAr?: string | null;
      description?: string | null;
      isActive?: boolean;
    },
  ): Promise<CategoryRow> {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }

  async countProducts(categoryId: string): Promise<number> {
    return prisma.product.count({ where: { categoryId } });
  }
}

export const categoriesRepository = new CategoriesRepository();
