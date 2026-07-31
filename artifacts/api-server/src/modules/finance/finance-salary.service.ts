import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../errors/AppError.js';
import { FinanceLedgerService } from './finance-ledger.service.js';
import { FinanceAuditService } from './finance-audit.service.js';
import { DocumentNumberService } from '../../lib/document-number.service.js';

// ─── Employee Service ─────────────────────────────────────────────────────────

export const EmployeeService = {
  async list(filters: { status?: string } = {}) {
    const where: Prisma.EmployeeWhereInput = {};
    if (filters.status) where.status = filters.status as any;
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return employees.map(serializeEmployee);
  },

  async getById(id: string) {
    const e = await prisma.employee.findUnique({ where: { id } });
    if (!e) throw new AppError('Employee not found', 404);
    return serializeEmployee(e);
  },

  async create(data: Record<string, any>) {
    const { name, phone, department, designation, joiningDate, basicSalary, allowances, deductions, notes } = data;
    if (!name?.trim()) throw new AppError('Employee name is required', 400);
    if (!basicSalary || isNaN(Number(basicSalary)) || Number(basicSalary) < 0) throw new AppError('Basic salary is required', 400);

    // Generate employee ID
    const lastEmp = await prisma.employee.findFirst({ orderBy: { employeeId: 'desc' }, select: { employeeId: true } });
    let nextNum = 1;
    if (lastEmp) {
      const lastNum = parseInt(lastEmp.employeeId.replace('EMP-', ''), 10);
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }
    const employeeId = `EMP-${String(nextNum).padStart(3, '0')}`;

    const emp = await prisma.employee.create({
      data: {
        employeeId,
        name: name.trim(),
        phone: phone?.trim() || null,
        department: department?.trim() || null,
        designation: designation?.trim() || null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        basicSalary: Number(basicSalary),
        allowances: Number(allowances ?? 0),
        deductions: Number(deductions ?? 0),
        notes: notes?.trim() || null,
      },
    });
    return serializeEmployee(emp);
  },

  async update(id: string, data: Record<string, any>) {
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new AppError('Employee not found', 404);

    const emp = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
        ...(data.department !== undefined && { department: data.department?.trim() || null }),
        ...(data.designation !== undefined && { designation: data.designation?.trim() || null }),
        ...(data.joiningDate !== undefined && { joiningDate: data.joiningDate ? new Date(data.joiningDate) : null }),
        ...(data.basicSalary !== undefined && { basicSalary: Number(data.basicSalary) }),
        ...(data.allowances !== undefined && { allowances: Number(data.allowances) }),
        ...(data.deductions !== undefined && { deductions: Number(data.deductions) }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes?.trim() || null }),
      },
    });
    return serializeEmployee(emp);
  },
};

// ─── Salary Service ───────────────────────────────────────────────────────────

export const SalaryService = {
  async listRecords(filters: { page?: number; limit?: number; employeeId?: string; month?: number; year?: number; status?: string } = {}) {
    const { page = 1, limit = 20, employeeId, month, year, status } = filters;
    const where: Prisma.SalaryRecordWhereInput = {};
    if (employeeId) where.employeeId = employeeId;
    if (month) where.month = month;
    if (year) where.year = year;
    if (status) where.status = status as any;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.salaryRecord.findMany({
        where,
        include: {
          employee: { select: { id: true, employeeId: true, name: true, department: true } },
          account: { select: { id: true, name: true, type: true } },
          paidBy: { select: { id: true, name: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.salaryRecord.count({ where }),
    ]);

    return {
      items: items.map(serializeSalary),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },

  async generate(userId: string, data: Record<string, any>) {
    const { employeeId, month, year, bonus, overtime, deductionOverride, notes } = data;
    if (!employeeId) throw new AppError('Employee ID is required', 400);
    if (!month || !year) throw new AppError('Month and year are required', 400);

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppError('Employee not found', 404);
    if (employee.status !== 'ACTIVE') throw new AppError('Employee is not active', 400);

    // Check for duplicate
    const existing = await prisma.salaryRecord.findUnique({
      where: { employeeId_month_year: { employeeId, month: Number(month), year: Number(year) } },
    });
    if (existing) throw new AppError(`Salary for this employee for ${month}/${year} has already been generated`, 409);

    const basicSalary = Number(employee.basicSalary);
    const allowances = Number(employee.allowances);
    const deductions = deductionOverride !== undefined ? Number(deductionOverride) : Number(employee.deductions);
    const bonusAmt = Number(bonus ?? 0);
    const overtimeAmt = Number(overtime ?? 0);
    const netSalary = basicSalary + allowances + bonusAmt + overtimeAmt - deductions;

    const number = await DocumentNumberService.generateNextNumber({ model: 'salaryRecord' as any, prefix: 'SAL', sequenceLength: 6 });

    const record = await prisma.salaryRecord.create({
      data: {
        number,
        employeeId,
        month: Number(month),
        year: Number(year),
        basicSalary,
        allowances,
        deductions,
        bonus: bonusAmt,
        overtime: overtimeAmt,
        netSalary,
        status: 'PENDING',
        notes: notes?.trim() || null,
      },
      include: {
        employee: { select: { id: true, employeeId: true, name: true, department: true } },
        account: { select: { id: true, name: true, type: true } },
        paidBy: { select: { id: true, name: true } },
      },
    });

    return serializeSalary(record);
  },

  async pay(userId: string, salaryId: string, data: Record<string, any>) {
    const { accountId } = data;
    if (!accountId) throw new AppError('Financial account is required to pay salary', 400);

    const record = await prisma.salaryRecord.findUnique({
      where: { id: salaryId },
      include: { employee: { select: { name: true } } },
    });
    if (!record) throw new AppError('Salary record not found', 404);
    if (record.status !== 'PENDING') throw new AppError('Only PENDING salary records can be paid', 400);

    const account = await prisma.financeAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new AppError('Financial account not found', 404);
    if (account.status !== 'ACTIVE') throw new AppError('Selected account is not active', 400);

    const net = Number(record.netSalary);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.salaryRecord.update({
        where: { id: salaryId },
        data: {
          status: 'PAID',
          accountId,
          paidAt: new Date(),
          paidById: userId,
        },
        include: {
          employee: { select: { id: true, employeeId: true, name: true, department: true } },
          account: { select: { id: true, name: true, type: true } },
          paidBy: { select: { id: true, name: true } },
        },
      });

      await FinanceLedgerService.postEntry(tx, {
        accountId,
        entryType: 'SALARY',
        debit: net,
        description: `Salary: ${record.employee.name} — ${monthName(record.month)} ${record.year}`,
        referenceNumber: record.number,
        referenceId: salaryId,
        createdById: userId,
      });

      await FinanceAuditService.log(tx, {
        action: 'SALARY_PAID',
        module: 'SALARY',
        referenceId: salaryId,
        reference: record.number,
        amount: net,
        accountId,
        userId,
        newValue: { employee: record.employee.name, month: record.month, year: record.year, netSalary: net },
      });

      return serializeSalary(updated);
    });
  },

  async createAdvance(userId: string, data: Record<string, any>) {
    const { employeeId, amount, accountId, reason } = data;

    if (!employeeId) throw new AppError('Employee ID is required', 400);
    if (!accountId) throw new AppError('Financial account is required', 400);
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new AppError('Amount must be greater than zero', 400);

    const [employee, account] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.financeAccount.findUnique({ where: { id: accountId } }),
    ]);
    if (!employee) throw new AppError('Employee not found', 404);
    if (!account) throw new AppError('Financial account not found', 404);
    if (account.status !== 'ACTIVE') throw new AppError('Selected account is not active', 400);

    const number = await DocumentNumberService.generateNextNumber({ model: 'salaryAdvance' as any, prefix: 'ADV', sequenceLength: 6 });
    const amt = Number(amount);

    return prisma.$transaction(async (tx) => {
      const advance = await tx.salaryAdvance.create({
        data: {
          number,
          employeeId,
          amount: amt,
          accountId,
          reason: reason?.trim() || null,
          createdById: userId,
        },
        include: {
          employee: { select: { id: true, name: true } },
          account: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      await FinanceLedgerService.postEntry(tx, {
        accountId,
        entryType: 'SALARY_ADVANCE',
        debit: amt,
        description: `Salary Advance: ${employee.name}`,
        referenceNumber: number,
        referenceId: advance.id,
        createdById: userId,
      });

      await FinanceAuditService.log(tx, {
        action: 'SALARY_ADVANCE_CREATED',
        module: 'SALARY',
        referenceId: advance.id,
        reference: number,
        amount: amt,
        accountId,
        userId,
        newValue: { employee: employee.name, amount: amt, reason },
      });

      return {
        ...advance,
        amount: advance.amount.toFixed(3),
        createdAt: advance.createdAt.toISOString(),
        advanceDate: advance.advanceDate.toISOString(),
      };
    });
  },

  async listAdvances(filters: { employeeId?: string; page?: number; limit?: number } = {}) {
    const { page = 1, limit = 20, employeeId } = filters;
    const where: Prisma.SalaryAdvanceWhereInput = {};
    if (employeeId) where.employeeId = employeeId;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.salaryAdvance.findMany({
        where,
        include: {
          employee: { select: { id: true, name: true, employeeId: true } },
          account: { select: { id: true, name: true, type: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.salaryAdvance.count({ where }),
    ]);

    return {
      items: items.map((a) => ({
        ...a,
        amount: a.amount.toFixed(3),
        createdAt: a.createdAt.toISOString(),
        advanceDate: a.advanceDate.toISOString(),
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeEmployee(e: any) {
  return {
    id: e.id,
    employeeId: e.employeeId,
    name: e.name,
    phone: e.phone,
    department: e.department,
    designation: e.designation,
    joiningDate: e.joiningDate?.toISOString() ?? null,
    basicSalary: e.basicSalary.toFixed(3),
    allowances: e.allowances.toFixed(3),
    deductions: e.deductions.toFixed(3),
    status: e.status,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
  };
}

function serializeSalary(r: any) {
  return {
    id: r.id,
    number: r.number,
    employee: r.employee,
    month: r.month,
    year: r.year,
    basicSalary: r.basicSalary.toFixed(3),
    allowances: r.allowances.toFixed(3),
    deductions: r.deductions.toFixed(3),
    bonus: r.bonus.toFixed(3),
    overtime: r.overtime.toFixed(3),
    netSalary: r.netSalary.toFixed(3),
    account: r.account,
    status: r.status,
    paidAt: r.paidAt?.toISOString() ?? null,
    paidBy: r.paidBy,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  };
}

function monthName(month: number) {
  return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
}
