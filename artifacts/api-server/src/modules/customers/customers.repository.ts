import { prisma } from '../../lib/prisma.js';
import type { Prisma } from '@prisma/client';

export interface CustomerRow {
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
}

export interface ListCustomersOptions {
  search?: string;
  page: number;
  limit: number;
  active?: boolean;
}

export class CustomersRepository {
  async findAll(opts: ListCustomersOptions): Promise<{ data: CustomerRow[]; total: number }> {
    const { search, page, limit, active } = opts;

    const where = {
      ...(search
        ? {
            OR: [
              { code: { contains: search, mode: 'insensitive' as const } },
              { name: { contains: search, mode: 'insensitive' as const } },
              { nameAr: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(active !== undefined ? { isActive: active } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<CustomerRow | null> {
    return prisma.customer.findUnique({ where: { id } });
  }

  async findByCode(code: string): Promise<CustomerRow | null> {
    return prisma.customer.findUnique({ where: { code } });
  }

  async findByPhone(phone: string): Promise<CustomerRow | null> {
    return prisma.customer.findFirst({ where: { phone } });
  }

  async findByEmail(email: string): Promise<CustomerRow | null> {
    return prisma.customer.findFirst({ where: { email } });
  }

  async create(data: {
    code: string;
    name: string;
    nameAr?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    creditLimit?: number | string | Prisma.Decimal;
    balance?: number | string | Prisma.Decimal;
  }): Promise<CustomerRow> {
    return prisma.customer.create({ data });
  }

  async update(
    id: string,
    data: {
      code?: string;
      name?: string;
      nameAr?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      creditLimit?: number | string | Prisma.Decimal;
      balance?: number | string | Prisma.Decimal;
      isActive?: boolean;
    },
  ): Promise<CustomerRow> {
    return prisma.customer.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.customer.delete({ where: { id } });
  }

  async countSales(customerId: string): Promise<number> {
    return prisma.sale.count({ where: { customerId } });
  }
}

export const customersRepository = new CustomersRepository();
