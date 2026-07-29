import { unitsRepository } from './units.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';

// ─── Service ─────────────────────────────────────────────────────────────────

export class UnitsService {
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

    const { data, total } = await unitsRepository.findAll({
      search: query.search?.trim(),
      page,
      limit,
      active,
    });

    if (total === 0 && !query.search && page === 1) {
      const defaults = [
        { name: 'Piece', nameAr: 'قطعة', abbreviation: 'PC' },
        { name: 'Kilogram', nameAr: 'كيلوغرام', abbreviation: 'KG' },
        { name: 'Liter', nameAr: 'لتر', abbreviation: 'L' },
        { name: 'Meter', nameAr: 'متر', abbreviation: 'M' },
        { name: 'Centimeter', nameAr: 'سنتيمتر', abbreviation: 'CM' },
        { name: 'Gram', nameAr: 'غرام', abbreviation: 'G' },
      ];
      
      for (const u of defaults) {
        await unitsRepository.create(u);
      }
      
      const refreshed = await unitsRepository.findAll({
        search: query.search?.trim(),
        page,
        limit,
        active,
      });
      
      return {
        data: refreshed.data.map((u) => this.serialize(u)),
        meta: { total: refreshed.total, page, limit, pages: Math.ceil(refreshed.total / limit) },
      };
    }

    return {
      data: data.map((u) => this.serialize(u)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const unit = await unitsRepository.findById(id);
    if (!unit) throw new NotFoundError('Unit');
    return this.serialize(unit);
  }

  async create(body: { name?: unknown; nameAr?: unknown; abbreviation?: unknown }) {
    const name = this.requireString(body.name, 'name');
    const abbreviation = this.requireString(body.abbreviation, 'abbreviation');

    if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');
    if (abbreviation.length > 20)
      throw new ValidationError('abbreviation must be 20 characters or fewer');

    const existing = await unitsRepository.findByName(name);
    if (existing) throw new ConflictError(`Unit "${name}" already exists`);

    const unit = await unitsRepository.create({
      name,
      nameAr: this.optionalString(body.nameAr),
      abbreviation,
    });

    return this.serialize(unit);
  }

  async update(
    id: string,
    body: { name?: unknown; nameAr?: unknown; abbreviation?: unknown; isActive?: unknown },
  ) {
    const unit = await unitsRepository.findById(id);
    if (!unit) throw new NotFoundError('Unit');

    const updates: Parameters<typeof unitsRepository.update>[1] = {};

    if (body.name !== undefined) {
      const name = this.requireString(body.name, 'name');
      if (name.length > 100) throw new ValidationError('name must be 100 characters or fewer');

      if (name !== unit.name) {
        const existing = await unitsRepository.findByName(name);
        if (existing) throw new ConflictError(`Unit "${name}" already exists`);
      }
      updates.name = name;
    }

    if (body.abbreviation !== undefined) {
      const abbreviation = this.requireString(body.abbreviation, 'abbreviation');
      if (abbreviation.length > 20)
        throw new ValidationError('abbreviation must be 20 characters or fewer');
      updates.abbreviation = abbreviation;
    }

    if (body.nameAr !== undefined) updates.nameAr = this.optionalString(body.nameAr);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    const updated = await unitsRepository.update(id, updates);
    return this.serialize(updated);
  }

  async delete(id: string) {
    const unit = await unitsRepository.findById(id);
    if (!unit) throw new NotFoundError('Unit');

    const productCount = await unitsRepository.countProducts(id);
    if (productCount > 0) {
      throw new ValidationError(
        `Cannot delete: ${productCount} product(s) use this unit`,
      );
    }

    await unitsRepository.delete(id);
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

  private serialize(u: {
    id: string;
    name: string;
    nameAr: string | null;
    abbreviation: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: u.id,
      name: u.name,
      nameAr: u.nameAr,
      abbreviation: u.abbreviation,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  }
}

export const unitsService = new UnitsService();
