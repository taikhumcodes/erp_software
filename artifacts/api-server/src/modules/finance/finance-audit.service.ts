import { Prisma } from '@prisma/client';

// ─── Finance Audit Service ────────────────────────────────────────────────────
//
// This service writes to the FinanceAuditLog database table.
// It is the persistence layer for the audit trail — not just pino logs.
//
// Every financial action in the system must call this service.
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLogInput {
  action: string;
  module: string;
  referenceId?: string;
  reference?: string;
  amount?: number;
  accountId?: string;
  userId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  remarks?: string;
  ipAddress?: string;
}

export const FinanceAuditService = {
  async log(tx: Prisma.TransactionClient, input: AuditLogInput) {
    const {
      action, module, referenceId, reference, amount,
      accountId, userId, oldValue, newValue, reason, remarks, ipAddress,
    } = input;

    return tx.financeAuditLog.create({
      data: {
        action: action as any,
        module,
        referenceId: referenceId ?? null,
        reference: reference ?? null,
        amount: amount != null ? new Prisma.Decimal(amount.toString()) : null,
        accountId: accountId ?? null,
        userId,
        oldValue: oldValue ? (oldValue as Prisma.InputJsonValue) : undefined,
        newValue: newValue ? (newValue as Prisma.InputJsonValue) : undefined,
        reason: reason ?? null,
        remarks: remarks ?? null,
        ipAddress: ipAddress ?? null,
      },
    });
  },

  async list(filters: {
    page?: number;
    limit?: number;
    action?: string;
    module?: string;
    userId?: string;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    const { prisma } = await import('../../lib/prisma.js');
    const { page = 1, limit = 50, action, module, userId, accountId, dateFrom, dateTo } = filters;

    const where: Prisma.FinanceAuditLogWhereInput = {};
    if (action) where.action = action as any;
    if (module) where.module = module;
    if (userId) where.userId = userId;
    if (accountId) where.accountId = accountId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      prisma.financeAuditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financeAuditLog.count({ where }),
    ]);

    return {
      items: entries.map((e) => ({
        id: e.id,
        action: e.action,
        module: e.module,
        referenceId: e.referenceId,
        reference: e.reference,
        amount: e.amount?.toFixed(3) ?? null,
        account: e.account,
        user: e.user,
        oldValue: e.oldValue,
        newValue: e.newValue,
        reason: e.reason,
        remarks: e.remarks,
        createdAt: e.createdAt.toISOString(),
      })),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  },
};
