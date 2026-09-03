import { prisma } from '../../lib/prisma.js';
import { Prisma } from '@prisma/client';

export interface BackupData {
  version: string;
  appName: string;
  exportedAt: string;
  exportedBy: string;
  metadata: {
    totalRecords: number;
    tables: Record<string, number>;
  };
  tables: {
    role: any[];
    user: any[];
    setting: any[];
    settingHistory: any[];
    unit: any[];
    category: any[];
    brand: any[];
    product: any[];
    customer: any[];
    supplier: any[];
    purchase: any[];
    purchaseItem: any[];
    purchaseHistory: any[];
    deliveryOrder: any[];
    deliveryOrderItem: any[];
    deliveryOrderHistory: any[];
    sale: any[];
    saleItem: any[];
    saleHistory: any[];
    quotation: any[];
    quotationItem: any[];
    quotationHistory: any[];
    payment: any[];
    paymentAttachment: any[];
    paymentAllocation: any[];
    financeAccount: any[];
    financeLedger: any[];
    moneyTransfer: any[];
    expenseCategory: any[];
    expense: any[];
    employee: any[];
    salaryRecord: any[];
    salaryAdvance: any[];
    financeAuditLog: any[];
  };
}

export class BackupService {
  /**
   * Export all 34 database tables into a single structured BackupData object
   */
  async exportAll(exportedBy = 'admin@albunyan.com'): Promise<BackupData> {
    const [
      role,
      user,
      setting,
      settingHistory,
      unit,
      category,
      brand,
      product,
      customer,
      supplier,
      purchase,
      purchaseItem,
      purchaseHistory,
      deliveryOrder,
      deliveryOrderItem,
      deliveryOrderHistory,
      sale,
      saleItem,
      saleHistory,
      quotation,
      quotationItem,
      quotationHistory,
      payment,
      paymentAttachment,
      paymentAllocation,
      financeAccount,
      financeLedger,
      moneyTransfer,
      expenseCategory,
      expense,
      employee,
      salaryRecord,
      salaryAdvance,
      financeAuditLog,
    ] = await Promise.all([
      prisma.role.findMany(),
      prisma.user.findMany(),
      prisma.setting.findMany(),
      prisma.settingHistory.findMany(),
      prisma.unit.findMany(),
      prisma.category.findMany(),
      prisma.brand.findMany(),
      prisma.product.findMany(),
      prisma.customer.findMany(),
      prisma.supplier.findMany(),
      prisma.purchase.findMany(),
      prisma.purchaseItem.findMany(),
      prisma.purchaseHistory.findMany(),
      prisma.deliveryOrder.findMany(),
      prisma.deliveryOrderItem.findMany(),
      prisma.deliveryOrderHistory.findMany(),
      prisma.sale.findMany(),
      prisma.saleItem.findMany(),
      prisma.saleHistory.findMany(),
      prisma.quotation.findMany(),
      prisma.quotationItem.findMany(),
      prisma.quotationHistory.findMany(),
      prisma.payment.findMany(),
      prisma.paymentAttachment.findMany(),
      prisma.paymentAllocation.findMany(),
      prisma.financeAccount.findMany(),
      prisma.financeLedger.findMany(),
      prisma.moneyTransfer.findMany(),
      prisma.expenseCategory.findMany(),
      prisma.expense.findMany(),
      prisma.employee.findMany(),
      prisma.salaryRecord.findMany(),
      prisma.salaryAdvance.findMany(),
      prisma.financeAuditLog.findMany(),
    ]);

    const tables: BackupData['tables'] = {
      role,
      user,
      setting,
      settingHistory,
      unit,
      category,
      brand,
      product,
      customer,
      supplier,
      purchase,
      purchaseItem,
      purchaseHistory,
      deliveryOrder,
      deliveryOrderItem,
      deliveryOrderHistory,
      sale,
      saleItem,
      saleHistory,
      quotation,
      quotationItem,
      quotationHistory,
      payment,
      paymentAttachment,
      paymentAllocation,
      financeAccount,
      financeLedger,
      moneyTransfer,
      expenseCategory,
      expense,
      employee,
      salaryRecord,
      salaryAdvance,
      financeAuditLog,
    };

    const counts: Record<string, number> = {};
    let totalRecords = 0;
    for (const [name, rows] of Object.entries(tables)) {
      counts[name] = rows.length;
      totalRecords += rows.length;
    }

    return {
      version: '1.0',
      appName: 'Al-Bunyan ERP',
      exportedAt: new Date().toISOString(),
      exportedBy,
      metadata: {
        totalRecords,
        tables: counts,
      },
      tables,
    };
  }

  /**
   * Get brief statistics of the current database records
   */
  async getStats() {
    const [
      users,
      products,
      customers,
      suppliers,
      sales,
      quotations,
      deliveryOrders,
      purchases,
      payments,
      expenses,
      ledgerEntries,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.customer.count(),
      prisma.supplier.count(),
      prisma.sale.count(),
      prisma.quotation.count(),
      prisma.deliveryOrder.count(),
      prisma.purchase.count(),
      prisma.payment.count(),
      prisma.expense.count(),
      prisma.financeLedger.count(),
    ]);

    return {
      users,
      products,
      customers,
      suppliers,
      sales,
      quotations,
      deliveryOrders,
      purchases,
      payments,
      expenses,
      ledgerEntries,
      lastCalculated: new Date().toISOString(),
    };
  }

  /**
   * Transactionally restore the entire database from a BackupData object.
   * Cleans tables in reverse foreign key order, then inserts all records in topological order.
   */
  async restore(backup: BackupData): Promise<{ restoredRecords: number; tables: Record<string, number> }> {
    if (!backup || !backup.tables || typeof backup.tables !== 'object') {
      throw new Error('Invalid backup file format: missing tables object');
    }

    const t = backup.tables;

    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Step 1: Break circular foreign key constraints before deletion
        await tx.sale.updateMany({ data: { deliveryOrderId: null } });
        await tx.quotation.updateMany({ data: { convertedToSaleId: null } });

        // Step 2: Delete in reverse dependency order (children first)
        await tx.salaryAdvance.deleteMany();
        await tx.salaryRecord.deleteMany();
        await tx.employee.deleteMany();

        await tx.financeAuditLog.deleteMany();
        await tx.financeLedger.deleteMany();
        await tx.moneyTransfer.deleteMany();
        await tx.expense.deleteMany();
        await tx.expenseCategory.deleteMany();

        await tx.paymentAllocation.deleteMany();
        await tx.paymentAttachment.deleteMany();
        await tx.payment.deleteMany();

        await tx.saleItem.deleteMany();
        await tx.saleHistory.deleteMany();
        await tx.quotationItem.deleteMany();
        await tx.quotationHistory.deleteMany();

        await tx.quotation.deleteMany();
        await tx.sale.deleteMany();

        await tx.deliveryOrderItem.deleteMany();
        await tx.deliveryOrderHistory.deleteMany();
        await tx.deliveryOrder.deleteMany();

        await tx.purchaseItem.deleteMany();
        await tx.purchaseHistory.deleteMany();
        await tx.purchase.deleteMany();

        await tx.product.deleteMany();
        await tx.brand.deleteMany();
        await tx.category.deleteMany();
        await tx.unit.deleteMany();

        await tx.customer.deleteMany();
        await tx.supplier.deleteMany();
        await tx.financeAccount.deleteMany();

        await tx.settingHistory.deleteMany();
        await tx.setting.deleteMany();

        await tx.user.deleteMany();
        await tx.role.deleteMany();

        // Step 3: Insert in topological order (parents first)
        // 3.1 Roles & Users
        if (t.role?.length) await tx.role.createMany({ data: t.role });
        if (t.user?.length) await tx.user.createMany({ data: t.user });

        // 3.2 Settings
        if (t.setting?.length) await tx.setting.createMany({ data: t.setting });
        if (t.settingHistory?.length) await tx.settingHistory.createMany({ data: t.settingHistory });

        // 3.3 Finance Accounts & Parties
        if (t.financeAccount?.length) await tx.financeAccount.createMany({ data: t.financeAccount });
        if (t.customer?.length) await tx.customer.createMany({ data: t.customer });
        if (t.supplier?.length) await tx.supplier.createMany({ data: t.supplier });

        // 3.4 Catalog (Units, Categories, Brands, Products)
        if (t.unit?.length) await tx.unit.createMany({ data: t.unit });
        if (t.category?.length) await tx.category.createMany({ data: t.category });
        if (t.brand?.length) await tx.brand.createMany({ data: t.brand });
        if (t.product?.length) await tx.product.createMany({ data: t.product });

        // 3.5 Purchases
        if (t.purchase?.length) await tx.purchase.createMany({ data: t.purchase });
        if (t.purchaseItem?.length) await tx.purchaseItem.createMany({ data: t.purchaseItem });
        if (t.purchaseHistory?.length) await tx.purchaseHistory.createMany({ data: t.purchaseHistory });

        // 3.6 Delivery Orders
        if (t.deliveryOrder?.length) await tx.deliveryOrder.createMany({ data: t.deliveryOrder });
        if (t.deliveryOrderItem?.length) await tx.deliveryOrderItem.createMany({ data: t.deliveryOrderItem });
        if (t.deliveryOrderHistory?.length) await tx.deliveryOrderHistory.createMany({ data: t.deliveryOrderHistory });

        // 3.7 Sales (temporarily strip deliveryOrderId to avoid circular FK issue during insert)
        if (t.sale?.length) {
          const salesWithoutDo = t.sale.map(s => ({ ...s, deliveryOrderId: null }));
          await tx.sale.createMany({ data: salesWithoutDo });
        }
        if (t.saleItem?.length) await tx.saleItem.createMany({ data: t.saleItem });
        if (t.saleHistory?.length) await tx.saleHistory.createMany({ data: t.saleHistory });

        // 3.8 Quotations (temporarily strip convertedToSaleId)
        if (t.quotation?.length) {
          const quotesWithoutSale = t.quotation.map(q => ({ ...q, convertedToSaleId: null }));
          await tx.quotation.createMany({ data: quotesWithoutSale });
        }
        if (t.quotationItem?.length) await tx.quotationItem.createMany({ data: t.quotationItem });
        if (t.quotationHistory?.length) await tx.quotationHistory.createMany({ data: t.quotationHistory });

        // Restore circular references now that all referenced rows exist
        if (t.sale?.length) {
          for (const s of t.sale) {
            if (s.deliveryOrderId) {
              await tx.sale.update({ where: { id: s.id }, data: { deliveryOrderId: s.deliveryOrderId } });
            }
          }
        }
        if (t.quotation?.length) {
          for (const q of t.quotation) {
            if (q.convertedToSaleId) {
              await tx.quotation.update({ where: { id: q.id }, data: { convertedToSaleId: q.convertedToSaleId } });
            }
          }
        }

        // 3.9 Payments
        if (t.payment?.length) await tx.payment.createMany({ data: t.payment });
        if (t.paymentAttachment?.length) await tx.paymentAttachment.createMany({ data: t.paymentAttachment });
        if (t.paymentAllocation?.length) await tx.paymentAllocation.createMany({ data: t.paymentAllocation });

        // 3.10 Expenses & Finance
        if (t.expenseCategory?.length) await tx.expenseCategory.createMany({ data: t.expenseCategory });
        if (t.expense?.length) await tx.expense.createMany({ data: t.expense });
        if (t.moneyTransfer?.length) await tx.moneyTransfer.createMany({ data: t.moneyTransfer });
        if (t.financeLedger?.length) await tx.financeLedger.createMany({ data: t.financeLedger });
        if (t.financeAuditLog?.length) await tx.financeAuditLog.createMany({ data: t.financeAuditLog });

        // 3.11 Employees & Payroll
        if (t.employee?.length) await tx.employee.createMany({ data: t.employee });
        if (t.salaryRecord?.length) await tx.salaryRecord.createMany({ data: t.salaryRecord });
        if (t.salaryAdvance?.length) await tx.salaryAdvance.createMany({ data: t.salaryAdvance });

        // Compute restored records count
        const counts: Record<string, number> = {};
        let restoredRecords = 0;
        for (const [name, rows] of Object.entries(t)) {
          counts[name] = (rows as any[]).length;
          restoredRecords += (rows as any[]).length;
        }

        return { restoredRecords, tables: counts };
      },
      {
        maxWait: 20000,
        timeout: 90000, // 90 seconds timeout for full database import
      }
    );
  }
}

export const backupService = new BackupService();
