import { ensureDbProxy } from '../src/lib/db-proxy.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await ensureDbProxy();
  const prisma = new PrismaClient();

  const failedCols = [
    { table: 'payments', col: 'mode', type: 'PaymentMode', def: "'IMMEDIATE'" },
    { table: 'payments', col: 'status', type: 'TransactionStatus', def: "'COMPLETED'" },
    { table: 'payment_attachments', col: 'category', type: 'AttachmentCategory', def: "'OTHER'" },
    { table: 'expenses', col: 'status', type: 'ExpenseStatus', def: "'PENDING'" },
    { table: 'employees', col: 'status', type: 'EmployeeStatus', def: "'ACTIVE'" },
    { table: 'salary_records', col: 'status', type: 'SalaryStatus', def: "'PENDING'" },
    { table: 'purchases', col: 'status', type: 'PurchaseStatus', def: "'DRAFT'" },
    { table: 'purchases', col: 'payment_status', type: 'PaymentStatus', def: "'UNPAID'" },
    { table: 'finance_accounts', col: 'status', type: 'AccountStatus', def: "'ACTIVE'" },
    { table: 'sales', col: 'status', type: 'SaleStatus', def: "'DRAFT'" },
    { table: 'sales', col: 'payment_status', type: 'PaymentStatus', def: "'UNPAID'" },
    { table: 'sales', col: 'order_source', type: 'OrderSource', def: "'DIRECT'" },
    { table: 'delivery_orders', col: 'status', type: 'DeliveryOrderStatus', def: "'DRAFT'" },
    { table: 'delivery_orders', col: 'invoice_status', type: 'InvoiceStatus', def: "'NOT_INVOICED'" },
    { table: 'quotations', col: 'status', type: 'QuotationStatus', def: "'DRAFT'" },
  ];

  for (const item of failedCols) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE demo."${item.table}" ALTER COLUMN "${item.col}" DROP DEFAULT;`);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE demo."${item.table}"
        ALTER COLUMN "${item.col}" TYPE demo."${item.type}"
        USING "${item.col}"::text::demo."${item.type}";
      `);
      await prisma.$executeRawUnsafe(`ALTER TABLE demo."${item.table}" ALTER COLUMN "${item.col}" SET DEFAULT ${item.def}::demo."${item.type}";`);
      console.log(`✓ Fixed demo."${item.table}"."${item.col}"`);
    } catch (e: any) {
      console.warn(`Could not fix ${item.table}.${item.col}:`, e.message);
    }
  }

  console.log('All enum defaults converted!');
  await prisma.$disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
