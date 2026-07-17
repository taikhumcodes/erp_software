import { brandsRepository } from './brands.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';

// ─── Service ─────────────────────────────────────────────────────────────────

export class BrandsService {
  async list(query: {
    search?: string;
    page?: number;
    limit?: number;
    active?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const active =
      query.active === 'true' ? true : query.active === 'false' ? false : undefined;

    const { data, total } = await brandsRepository.findAll({
      search: query.search?.trim(),
      page,
      limit,
      active,
    });

    return {
      data: data.map((b) => this.serialize(b)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError('Brand');
    return this.serialize(brand);
  }

  async create(body: { name?: unknown; nameAr?: unknown; logoUrl?: unknown }) {
    const name = this.requireString(body.name, 'name');
    if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');

    const existing = await brandsRepository.findByName(name);
    if (existing) throw new ConflictError(`Brand "${name}" already exists`);

    const brand = await brandsRepository.create({
      name,
      nameAr: this.optionalString(body.nameAr),
      logoUrl: this.optionalString(body.logoUrl),
    });

    return this.serialize(brand);
  }

  async update(
    id: string,
    body: { name?: unknown; nameAr?: unknown; logoUrl?: unknown; isActive?: unknown },
  ) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError('Brand');

    const updates: Parameters<typeof brandsRepository.update>[1] = {};

    if (body.name !== undefined) {
      const name = this.requireString(body.name, 'name');
      if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');

      if (name !== brand.name) {
        const existing = await brandsRepository.findByName(name);
        if (existing) throw new ConflictError(`Brand "${name}" already exists`);
      }
      updates.name = name;
    }

    if (body.nameAr !== undefined) updates.nameAr = this.optionalString(body.nameAr);
    if (body.logoUrl !== undefined) updates.logoUrl = this.optionalString(body.logoUrl);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    const updated = await brandsRepository.update(id, updates);
    return this.serialize(updated);
  }

  async delete(id: string) {
    const brand = await brandsRepository.findById(id);
    if (!brand) throw new NotFoundError('Brand');

    const productCount = await brandsRepository.countProducts(id);
    if (productCount > 0) {
      throw new ValidationError(
        `Cannot delete: ${productCount} product(s) are assigned to this brand`,
      );
    }

    await brandsRepository.delete(id);
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

  private serialize(b: {
    id: string;
    name: string;
    nameAr: string | null;
    logoUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: b.id,
      name: b.name,
      nameAr: b.nameAr,
      logoUrl: b.logoUrl,
      isActive: b.isActive,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    };
  }
}

export const brandsService = new BrandsService();
