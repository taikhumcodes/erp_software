import { categoriesRepository } from './categories.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';

// ─── Service ─────────────────────────────────────────────────────────────────

export class CategoriesService {
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

    const { data, total } = await categoriesRepository.findAll({
      search: query.search?.trim(),
      page,
      limit,
      active,
    });

    return {
      data: data.map((c) => this.serialize(c)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const category = await categoriesRepository.findById(id);
    if (!category) throw new NotFoundError('Category');
    return this.serialize(category);
  }

  async create(body: { name?: unknown; nameAr?: unknown; description?: unknown }) {
    const name = this.requireString(body.name, 'name');
    if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');

    const existing = await categoriesRepository.findByName(name);
    if (existing) throw new ConflictError(`Category "${name}" already exists`);

    const category = await categoriesRepository.create({
      name,
      nameAr: this.optionalString(body.nameAr),
      description: this.optionalString(body.description),
    });

    return this.serialize(category);
  }

  async update(
    id: string,
    body: { name?: unknown; nameAr?: unknown; description?: unknown; isActive?: unknown },
  ) {
    const category = await categoriesRepository.findById(id);
    if (!category) throw new NotFoundError('Category');

    const updates: Parameters<typeof categoriesRepository.update>[1] = {};

    if (body.name !== undefined) {
      const name = this.requireString(body.name, 'name');
      if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');

      if (name !== category.name) {
        const existing = await categoriesRepository.findByName(name);
        if (existing) throw new ConflictError(`Category "${name}" already exists`);
      }
      updates.name = name;
    }

    if (body.nameAr !== undefined) updates.nameAr = this.optionalString(body.nameAr);
    if (body.description !== undefined) updates.description = this.optionalString(body.description);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    const updated = await categoriesRepository.update(id, updates);
    return this.serialize(updated);
  }

  async delete(id: string) {
    const category = await categoriesRepository.findById(id);
    if (!category) throw new NotFoundError('Category');

    const productCount = await categoriesRepository.countProducts(id);
    if (productCount > 0) {
      throw new ValidationError(
        `Cannot delete: ${productCount} product(s) are assigned to this category`,
      );
    }

    await categoriesRepository.delete(id);
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

  private serialize(c: {
    id: string;
    name: string;
    nameAr: string | null;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}

export const categoriesService = new CategoriesService();
