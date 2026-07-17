import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string; nameAr: string | null };
  brandId: string | null;
  brand: { id: string; name: string; nameAr: string | null } | null;
  unitId: string;
  unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
  costPrice: Prisma.Decimal;
  sellingPrice: Prisma.Decimal;
  stockQuantity: Prisma.Decimal;
  reorderLevel: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListProductsOptions {
  search?: string;
  page: number;
  limit: number;
  active?: boolean;
  categoryId?: string;
  brandId?: string;
}

const productSelect = {
  id: true,
  sku: true,
  name: true,
  nameAr: true,
  description: true,
  categoryId: true,
  category: { select: { id: true, name: true, nameAr: true } },
  brandId: true,
  brand: { select: { id: true, name: true, nameAr: true } },
  unitId: true,
  unit: { select: { id: true, name: true, nameAr: true, abbreviation: true } },
  costPrice: true,
  sellingPrice: true,
  stockQuantity: true,
  reorderLevel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─── Repository ───────────────────────────────────────────────────────────────

export class ProductsRepository {
  async findAll(opts: ListProductsOptions): Promise<{ data: ProductRow[]; total: number }> {
    const { search, page, limit, active, categoryId, brandId } = opts;

    const where: Prisma.ProductWhereInput = {
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nameAr: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(active !== undefined ? { isActive: active } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: productSelect,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return { data: data as ProductRow[], total };
  }

  async findById(id: string): Promise<ProductRow | null> {
    return prisma.product.findUnique({
      where: { id },
      select: productSelect,
    }) as Promise<ProductRow | null>;
  }

  async findBySku(sku: string): Promise<{ id: string } | null> {
    return prisma.product.findUnique({ where: { sku }, select: { id: true } });
  }

  async create(data: {
    sku: string;
    name: string;
    nameAr?: string | null;
    description?: string | null;
    categoryId: string;
    brandId?: string | null;
    unitId: string;
    costPrice: number | string;
    sellingPrice: number | string;
    stockQuantity?: number | string;
    reorderLevel?: number | string;
  }): Promise<ProductRow> {
    return prisma.product.create({
      data: {
        sku: data.sku,
        name: data.name,
        nameAr: data.nameAr,
        description: data.description,
        categoryId: data.categoryId,
        brandId: data.brandId,
        unitId: data.unitId,
        costPrice: new Prisma.Decimal(data.costPrice),
        sellingPrice: new Prisma.Decimal(data.sellingPrice),
        stockQuantity: data.stockQuantity !== undefined ? new Prisma.Decimal(data.stockQuantity) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? new Prisma.Decimal(data.reorderLevel) : undefined,
      },
      select: productSelect,
    }) as Promise<ProductRow>;
  }

  async update(
    id: string,
    data: {
      sku?: string;
      name?: string;
      nameAr?: string | null;
      description?: string | null;
      categoryId?: string;
      brandId?: string | null;
      unitId?: string;
      costPrice?: number | string;
      sellingPrice?: number | string;
      stockQuantity?: number | string;
      reorderLevel?: number | string;
      isActive?: boolean;
    },
  ): Promise<ProductRow> {
    return prisma.product.update({
      where: { id },
      data: {
        ...data,
        costPrice: data.costPrice !== undefined ? new Prisma.Decimal(data.costPrice) : undefined,
        sellingPrice: data.sellingPrice !== undefined ? new Prisma.Decimal(data.sellingPrice) : undefined,
        stockQuantity: data.stockQuantity !== undefined ? new Prisma.Decimal(data.stockQuantity) : undefined,
        reorderLevel: data.reorderLevel !== undefined ? new Prisma.Decimal(data.reorderLevel) : undefined,
      },
      select: productSelect,
    }) as Promise<ProductRow>;
  }

  async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  }

  async hasTransactions(id: string): Promise<boolean> {
    const [purchases, sales] = await Promise.all([
      prisma.purchaseItem.count({ where: { productId: id } }),
      prisma.saleItem.count({ where: { productId: id } }),
    ]);
    return purchases > 0 || sales > 0;
  }
}

export const productsRepository = new ProductsRepository();
