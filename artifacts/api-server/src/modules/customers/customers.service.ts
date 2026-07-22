import { customersRepository } from './customers.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '../../errors/AppError.js';
import type { Prisma } from '@prisma/client';
import { formatPhoneNumber, generateCustomerCode, getPhoneValidationError, normalizeUniqueValue } from './customers.utils.js';

export class CustomersService {
  async list(query: { search?: string; page?: number | string; limit?: number | string; active?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const active = query.active === 'true' ? true : query.active === 'false' ? false : undefined;

    const { data, total } = await customersRepository.findAll({
      search: query.search?.trim(),
      page,
      limit,
      active,
    });

    return {
      data: data.map((customer) => this.serialize(customer)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getOne(id: string) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer');
    return this.serialize(customer);
  }

  async create(body: Record<string, unknown>) {
    const name = this.requireString(body.name, 'name');
    const providedCode = this.optionalString(body.code);
    const phone = this.requirePhone(body.phone);
    const normalizedPhone = normalizeUniqueValue(phone, 'phone');
    const normalizedEmail = normalizeUniqueValue(body.email, 'email');

    const code = providedCode ?? (await this.generateNextCode());

    if (providedCode) {
      const existing = await customersRepository.findByCode(code);
      if (existing) throw new ConflictError(`Customer code "${code}" already exists`);
    }

    await this.ensureUniqueIdentity({ code, phone: normalizedPhone, email: normalizedEmail, id: undefined });

    const customer = await customersRepository.create({
      code,
      name,
      nameAr: this.optionalString(body.nameAr),
      phone,
      email: this.optionalEmail(body.email),
      address: this.optionalString(body.address),
      creditLimit: this.optionalDecimal(body.creditLimit) ?? 0,
      balance: this.optionalDecimal(body.balance) ?? 0,
    });

    return this.serialize(customer);
  }

  async update(id: string, body: Record<string, unknown>) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer');

    const updates: Parameters<typeof customersRepository.update>[1] = {};
    const normalizedEmail = body.email !== undefined ? normalizeUniqueValue(body.email, 'email') : undefined;

    if (body.code !== undefined) {
      const providedCode = this.optionalString(body.code);
      const code = providedCode ?? customer.code;
      if (providedCode && code !== customer.code) {
        const existing = await customersRepository.findByCode(code);
        if (existing) throw new ConflictError(`Customer code "${code}" already exists`);
      }
      updates.code = code;
    }

    if (body.name !== undefined) updates.name = this.requireString(body.name, 'name');
    if (body.nameAr !== undefined) updates.nameAr = this.optionalString(body.nameAr);
    if (body.phone !== undefined) updates.phone = this.requirePhone(body.phone);
    if (body.email !== undefined) updates.email = this.optionalEmail(body.email);
    if (body.address !== undefined) updates.address = this.optionalString(body.address);
    if (body.creditLimit !== undefined) updates.creditLimit = this.optionalDecimal(body.creditLimit) ?? 0;
    if (body.balance !== undefined) updates.balance = this.optionalDecimal(body.balance) ?? 0;
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);

    await this.ensureUniqueIdentity({
      code: updates.code ?? customer.code,
      phone: updates.phone,
      email: normalizedEmail,
      id,
    });

    const updated = await customersRepository.update(id, updates);
    return this.serialize(updated);
  }

  async delete(id: string) {
    const customer = await customersRepository.findById(id);
    if (!customer) throw new NotFoundError('Customer');

    const saleCount = await customersRepository.countSales(id);
    if (saleCount > 0) {
      throw new ValidationError(`Cannot delete: ${saleCount} sale(s) are assigned to this customer`);
    }

    await customersRepository.delete(id);
  }

  private async generateNextCode(): Promise<string> {
    const customers = await customersRepository.findAll({ page: 1, limit: 1000 });
    const latest = customers.data
      .map((customer) => customer.code)
      .filter((code) => /^CUST-\d{3}$/.test(code))
      .map((code) => Number(code.split('-')[1]))
      .sort((a, b) => b - a)[0] ?? 0;

    return generateCustomerCode(latest);
  }

  private async ensureUniqueIdentity({ code, phone, email, id }: { code?: string; phone?: string | null; email?: string | null; id?: string }) {
    if (code) {
      const existingCode = await customersRepository.findByCode(code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictError(`Customer code "${code}" already exists`);
      }
    }

    if (phone) {
      const existingPhone = await customersRepository.findByPhone(phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictError('A customer with this phone number already exists');
      }
    }

    if (email) {
      const existingEmail = await customersRepository.findByEmail(email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictError('A customer with this email already exists');
      }
    }
  }

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

  private requirePhone(value: unknown): string {
    const error = getPhoneValidationError(value);
    if (error) {
      throw new ValidationError(error);
    }
    return formatPhoneNumber(value) ?? '';
  }

  private optionalEmail(value: unknown): string | null {
    return this.optionalString(normalizeUniqueValue(value, 'email'));
  }

  private optionalDecimal(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return isNaN(n) ? null : Math.max(0, n);
  }

  private serialize(customer: {
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    creditLimit: number | string | Prisma.Decimal;
    balance: number | string | Prisma.Decimal;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      nameAr: customer.nameAr,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      creditLimit: Number(customer.creditLimit).toFixed(3),
      balance: Number(customer.balance).toFixed(3),
      isActive: customer.isActive,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}

export const customersService = new CustomersService();
