import { productsRepository } from './products.repository.js';
import { prisma } from '../../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';
import type { ProductRow } from './products.repository.js';

// ─── Service ─────────────────────────────────────────────────────────────────

export class ProductsService {
  async list(query: {
    search?: string;
    page?: number | string;
    limit?: number | string;
    active?: string;
    categoryId?: string;
    brandId?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const active =
      query.active === 'true' ? true : query.active === 'false' ? false : undefined;

    const { data, total } = await productsRepository.findAll({
      search: query.search?.trim(),
      page,
      limit,
      active,
      categoryId: query.categoryId,
      brandId: query.brandId,
    });

    return {
      data: data.map((p) => this.serialize(p)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product');
    return this.serialize(product);
  }

  async create(body: Record<string, unknown>) {
    const sku = this.requireString(body.sku, 'sku');
    const name = this.requireString(body.name, 'name');
    const categoryId = this.requireString(body.categoryId, 'categoryId');
    const unitId = this.requireString(body.unitId, 'unitId');
    const costPrice = this.requirePositiveDecimal(body.costPrice, 'costPrice');
    const sellingPrice = this.requirePositiveDecimal(body.sellingPrice, 'sellingPrice');

    const existing = await productsRepository.findBySku(sku);
    if (existing) throw new ConflictError(`Product code "${sku}" already exists`);

    // Validate FK existence
    await this.validateCategory(categoryId);
    await this.validateUnit(unitId);
    const brandId = this.optionalString(body.brandId);
    if (brandId) await this.validateBrand(brandId);

    const stockQuantity = this.optionalDecimal(body.stockQuantity) ?? 0;
    const reorderLevel = this.optionalDecimal(body.reorderLevel) ?? 0;

    const product = await productsRepository.create({
      sku,
      name,
      nameAr: this.optionalString(body.nameAr),
      description: this.optionalString(body.description),
      categoryId,
      brandId: brandId ?? null,
      unitId,
      costPrice,
      sellingPrice,
      stockQuantity,
      reorderLevel,
    });

    return this.serialize(product);
  }

  async update(id: string, body: Record<string, unknown>) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product');

    const updates: Parameters<typeof productsRepository.update>[1] = {};

    if (body.sku !== undefined) {
      const sku = this.requireString(body.sku, 'sku');
      if (sku !== product.sku) {
        const existing = await productsRepository.findBySku(sku);
        if (existing) throw new ConflictError(`Product code "${sku}" already exists`);
      }
      updates.sku = sku;
    }

    if (body.name !== undefined) updates.name = this.requireString(body.name, 'name');
    if (body.nameAr !== undefined) updates.nameAr = this.optionalString(body.nameAr);
    if (body.description !== undefined) updates.description = this.optionalString(body.description);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    if (body.categoryId !== undefined) {
      updates.categoryId = this.requireString(body.categoryId, 'categoryId');
      await this.validateCategory(updates.categoryId);
    }

    if (body.unitId !== undefined) {
      updates.unitId = this.requireString(body.unitId, 'unitId');
      await this.validateUnit(updates.unitId);
    }

    if (body.brandId !== undefined) {
      const brandId = this.optionalString(body.brandId);
      if (brandId) await this.validateBrand(brandId);
      updates.brandId = brandId;
    }

    if (body.costPrice !== undefined) {
      updates.costPrice = this.requirePositiveDecimal(body.costPrice, 'costPrice');
    }
    if (body.sellingPrice !== undefined) {
      updates.sellingPrice = this.requirePositiveDecimal(body.sellingPrice, 'sellingPrice');
    }
    if (body.stockQuantity !== undefined) {
      const v = this.optionalDecimal(body.stockQuantity);
      if (v !== null && v !== undefined) updates.stockQuantity = v;
    }
    if (body.reorderLevel !== undefined) {
      const v = this.optionalDecimal(body.reorderLevel);
      if (v !== null && v !== undefined) updates.reorderLevel = v;
    }

    const updated = await productsRepository.update(id, updates);
    return this.serialize(updated);
  }

  async delete(id: string) {
    const product = await productsRepository.findById(id);
    if (!product) throw new NotFoundError('Product');

    const hasTransactions = await productsRepository.hasTransactions(id);
    if (hasTransactions) {
      throw new ValidationError(
        'Cannot delete: this product has associated purchase or sale records',
      );
    }

    await productsRepository.delete(id);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new ValidationError(`${field} is required`);
    }
    return value.trim();
  }

  private optionalString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    return typeof value === 'string' ? value.trim() || null : null;
  }

  private requirePositiveDecimal(value: unknown, field: string): number {
    const n = Number(value);
    if (isNaN(n)) throw new ValidationError(`${field} must be a valid number`);
    if (n < 0) throw new ValidationError(`${field} must be zero or positive`);
    return n;
  }

  private optionalDecimal(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : Math.max(0, n);
  }

  private async validateCategory(id: string) {
    const cat = await prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!cat) throw new ValidationError('categoryId refers to a non-existent category');
  }

  private async validateUnit(id: string) {
    const unit = await prisma.unit.findUnique({ where: { id }, select: { id: true } });
    if (!unit) throw new ValidationError('unitId refers to a non-existent unit');
  }

  private async validateBrand(id: string) {
    const brand = await prisma.brand.findUnique({ where: { id }, select: { id: true } });
    if (!brand) throw new ValidationError('brandId refers to a non-existent brand');
  }

  private serialize(p: ProductRow) {
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      nameAr: p.nameAr,
      description: p.description,
      category: p.category,
      categoryId: p.categoryId,
      brand: p.brand,
      brandId: p.brandId,
      unit: p.unit,
      unitId: p.unitId,
      costPrice: p.costPrice.toFixed(3),
      sellingPrice: p.sellingPrice.toFixed(3),
      stockQuantity: p.stockQuantity.toFixed(3),
      reorderLevel: p.reorderLevel.toFixed(3),
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}

export const productsService = new ProductsService();
