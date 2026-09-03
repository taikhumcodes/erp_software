import { prisma } from '../../lib/prisma.js';
import { DATA_SOURCES, STANDARD_REPORTS_METADATA } from './reports.registry.js';
import { formatKWD } from './reports.export.js';

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  supplierId?: string;
  productId?: string;
  categoryId?: string;
  status?: string;
  paymentMethod?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StandardReportResult {
  metadata: {
    id: string;
    nameEn: string;
    nameAr: string;
    generatedAt: string;
    period: { start?: string; end?: string };
  };
  columns: { id: string; label: string; labelAr?: string; type?: string }[];
  rows: Record<string, any>[];
  totals: Record<string, any>;
  kpis?: { label: string; labelAr?: string; value: string | number; change?: string }[];
  chartData?: any[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const ReportsService = {
  // ── High-Level Hub Summary KPIs ─────────────────────────────────────────────
  async getHubOverview(): Promise<{
    salesTotal: number;
    profitTotal: number;
    receivablesTotal: number;
    payablesTotal: number;
    inventoryValuation: number;
    cashBankLiquidity: number;
  }> {
    const [salesAgg, recAgg, payAgg, invAgg, cashAgg] = await Promise.all([
      // Total Sales this year
      prisma.$queryRawUnsafe<[{ total: number | string; profit: number | string }]>(`
        SELECT 
          COALESCE(SUM("net_amount"), 0)::float as total,
          COALESCE(SUM("net_amount" - COALESCE(
            (SELECT SUM(si.quantity * COALESCE(p.cost_price, 0)) FROM "sale_items" si JOIN "products" p ON si.product_id = p.id WHERE si.sale_id = "sales".id), 0
          )), 0)::float as profit
        FROM "sales" 
        WHERE "status" != 'CANCELLED'
      `),
      // Total Receivables
      prisma.$queryRawUnsafe<[{ total: number | string }]>(`
        SELECT COALESCE(SUM("outstanding_amount"), 0)::float as total FROM "sales" WHERE "status" != 'CANCELLED' AND "outstanding_amount" > 0
      `),
      // Total Payables
      prisma.$queryRawUnsafe<[{ total: number | string }]>(`
        SELECT COALESCE(SUM("outstanding_amount"), 0)::float as total FROM "purchases" WHERE "status" != 'CANCELLED' AND "outstanding_amount" > 0
      `),
      // Stock Valuation
      prisma.$queryRawUnsafe<[{ total: number | string }]>(`
        SELECT COALESCE(SUM("stock_quantity" * "cost_price"), 0)::float as total FROM "products" WHERE "is_active" = TRUE
      `),
      // Cash & Bank Liquidity
      prisma.$queryRawUnsafe<[{ total: number | string }]>(`
        SELECT (
          COALESCE((SELECT SUM("opening_balance") FROM "finance_accounts" WHERE "status" = 'ACTIVE'), 0) +
          COALESCE((SELECT SUM("credit" - "debit") FROM "finance_ledger"), 0)
        )::float as total
      `),
    ]);

    return {
      salesTotal: Number(salesAgg[0]?.total ?? 0),
      profitTotal: Number(salesAgg[0]?.profit ?? 0),
      receivablesTotal: Number(recAgg[0]?.total ?? 0),
      payablesTotal: Number(payAgg[0]?.total ?? 0),
      inventoryValuation: Number(invAgg[0]?.total ?? 0),
      cashBankLiquidity: Number(cashAgg[0]?.total ?? 0),
    };
  },

  // ── Standard Report Engine ──────────────────────────────────────────────────
  async runStandardReport(reportId: string, params: ReportFilterParams): Promise<StandardReportResult> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(250, Math.max(1, params.limit ?? 50));
    const offset = (page - 1) * limit;

    const metaInfo = STANDARD_REPORTS_METADATA.find(r => r.id === reportId) || {
      id: reportId,
      nameEn: 'Report',
      nameAr: 'تقرير',
      descEn: '',
      descAr: '',
      family: 'general',
      requiredRoles: [],
    };

    switch (reportId) {
      // ──────────────────────── 1. SALES SUMMARY ────────────────────────
      case 'sales_summary': {
        const conditions: string[] = [`s."status" != 'CANCELLED'`];
        const values: any[] = [];
        let idx = 1;

        if (params.startDate) {
          conditions.push(`s."sale_date" >= $${idx++}::timestamp`);
          values.push(params.startDate);
        }
        if (params.endDate) {
          conditions.push(`s."sale_date" <= $${idx++}::timestamp`);
          values.push(params.endDate);
        }
        if (params.customerId) {
          conditions.push(`s."customer_id" = $${idx++}`);
          values.push(params.customerId);
        }
        if (params.search) {
          conditions.push(`(s."number" ILIKE $${idx} OR c."name" ILIKE $${idx})`);
          values.push(`%${params.search}%`);
          idx++;
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            s.id,
            s.number,
            s.sale_date as "saleDate",
            c.name as "customerName",
            u.name as "userName",
            s.total_amount::float as "grossAmount",
            s.discount::float as "discount",
            s.net_amount::float as "netAmount",
            s.paid_amount::float as "paidAmount",
            s.outstanding_amount::float as "outstandingAmount",
            s.payment_status as "paymentStatus",
            COALESCE((
              SELECT SUM(si.quantity * COALESCE(p.cost_price, 0))
              FROM "sale_items" si 
              JOIN "products" p ON si.product_id = p.id 
              WHERE si.sale_id = s.id
            ), 0)::float as "costAmount"
          FROM "sales" s
          JOIN "customers" c ON s.customer_id = c.id
          LEFT JOIN "users" u ON s.user_id = u.id
          WHERE ${where}
          ORDER BY s.sale_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `, ...values);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(*)::int as count 
          FROM "sales" s 
          JOIN "customers" c ON s.customer_id = c.id 
          WHERE ${where}
        `, ...values);
        const total = Number(countRes[0]?.count ?? 0);

        const totRes = await prisma.$queryRawUnsafe<[{ gross: number; discount: number; net: number; paid: number; outstanding: number; cost: number }]>(`
          SELECT 
            COALESCE(SUM(s.total_amount), 0)::float as gross,
            COALESCE(SUM(s.discount), 0)::float as discount,
            COALESCE(SUM(s.net_amount), 0)::float as net,
            COALESCE(SUM(s.paid_amount), 0)::float as paid,
            COALESCE(SUM(s.outstanding_amount), 0)::float as outstanding,
            COALESCE(SUM((
              SELECT SUM(si.quantity * COALESCE(p.cost_price, 0))
              FROM "sale_items" si 
              JOIN "products" p ON si.product_id = p.id 
              WHERE si.sale_id = s.id
            )), 0)::float as cost
          FROM "sales" s
          JOIN "customers" c ON s.customer_id = c.id
          WHERE ${where}
        `, ...values);

        const t = totRes[0] || { gross: 0, discount: 0, net: 0, paid: 0, outstanding: 0, cost: 0 };
        const profit = t.net - t.cost;
        const margin = t.net > 0 ? ((profit / t.net) * 100).toFixed(1) + '%' : '0.0%';

        const columns = [
          { id: 'number', label: 'Invoice #', labelAr: 'رقم الفاتورة', type: 'string' },
          { id: 'saleDate', label: 'Date', labelAr: 'التاريخ', type: 'date' },
          { id: 'customerName', label: 'Customer', labelAr: 'العميل', type: 'string' },
          { id: 'grossAmount', label: 'Gross (KWD)', labelAr: 'الإجمالي', type: 'currency' },
          { id: 'discount', label: 'Discount', labelAr: 'الخصم', type: 'currency' },
          { id: 'netAmount', label: 'Net Amount (KWD)', labelAr: 'الصافي', type: 'currency' },
          { id: 'paidAmount', label: 'Paid (KWD)', labelAr: 'المدفوع', type: 'currency' },
          { id: 'outstandingAmount', label: 'Balance (KWD)', labelAr: 'المتبقي', type: 'currency' },
          { id: 'profitAmount', label: 'Gross Profit', labelAr: 'الربح', type: 'currency' },
          { id: 'paymentStatus', label: 'Payment Status', labelAr: 'حالة السداد', type: 'badge' },
        ];

        const mappedRows = rows.map(r => {
          const rowProfit = r.netAmount - (r.costAmount || 0);
          return {
            ...r,
            saleDate: r.saleDate instanceof Date ? r.saleDate.toISOString().slice(0, 10) : String(r.saleDate).slice(0, 10),
            profitAmount: Number(rowProfit.toFixed(3)),
          };
        });

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: mappedRows,
          totals: {
            grossAmount: t.gross,
            discount: t.discount,
            netAmount: t.net,
            paidAmount: t.paid,
            outstandingAmount: t.outstanding,
            profitAmount: profit,
          },
          kpis: [
            { label: 'Total Invoices', labelAr: 'عدد الفواتير', value: total },
            { label: 'Net Sales', labelAr: 'صافي المبيعات', value: formatKWD(t.net) + ' KWD' },
            { label: 'Gross Profit', labelAr: 'إجمالي الربح', value: formatKWD(profit) + ' KWD' },
            { label: 'Profit Margin', labelAr: 'هامش الربح', value: margin },
            { label: 'Outstanding Balance', labelAr: 'الرصيد المتبقي', value: formatKWD(t.outstanding) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 2. SALES BY CUSTOMER ────────────────────────
      case 'sales_by_customer': {
        const conditions: string[] = [`s."status" != 'CANCELLED'`];
        const values: any[] = [];
        let idx = 1;

        if (params.startDate) {
          conditions.push(`s."sale_date" >= $${idx++}::timestamp`);
          values.push(params.startDate);
        }
        if (params.endDate) {
          conditions.push(`s."sale_date" <= $${idx++}::timestamp`);
          values.push(params.endDate);
        }
        if (params.search) {
          conditions.push(`(c."name" ILIKE $${idx} OR c."code" ILIKE $${idx})`);
          values.push(`%${params.search}%`);
          idx++;
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            c.id,
            c.code as "customerCode",
            c.name as "customerName",
            c.phone as "customerPhone",
            COUNT(s.id)::int as "invoiceCount",
            COALESCE(SUM(s.net_amount), 0)::float as "totalSales",
            COALESCE(SUM(s.paid_amount), 0)::float as "totalPaid",
            COALESCE(SUM(s.outstanding_amount), 0)::float as "outstanding",
            MAX(s.sale_date) as "lastSaleDate"
          FROM "customers" c
          JOIN "sales" s ON s.customer_id = c.id
          WHERE ${where}
          GROUP BY c.id, c.code, c.name, c.phone
          ORDER BY "totalSales" DESC
          LIMIT ${limit} OFFSET ${offset}
        `, ...values);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(DISTINCT c.id)::int as count
          FROM "customers" c
          JOIN "sales" s ON s.customer_id = c.id
          WHERE ${where}
        `, ...values);
        const total = Number(countRes[0]?.count ?? 0);

        const totRes = await prisma.$queryRawUnsafe<[{ sales: number; paid: number; outstanding: number }]>(`
          SELECT 
            COALESCE(SUM(s.net_amount), 0)::float as sales,
            COALESCE(SUM(s.paid_amount), 0)::float as paid,
            COALESCE(SUM(s.outstanding_amount), 0)::float as outstanding
          FROM "sales" s
          JOIN "customers" c ON s.customer_id = c.id
          WHERE ${where}
        `, ...values);
        const t = totRes[0] || { sales: 0, paid: 0, outstanding: 0 };

        const columns = [
          { id: 'customerCode', label: 'Code', labelAr: 'كود العميل', type: 'string' },
          { id: 'customerName', label: 'Customer Name', labelAr: 'اسم العميل', type: 'string' },
          { id: 'customerPhone', label: 'Phone', labelAr: 'الهاتف', type: 'string' },
          { id: 'invoiceCount', label: 'Invoices', labelAr: 'عدد الفواتير', type: 'number' },
          { id: 'totalSales', label: 'Total Sales (KWD)', labelAr: 'إجمالي المبيعات', type: 'currency' },
          { id: 'totalPaid', label: 'Paid Amount (KWD)', labelAr: 'المسدد', type: 'currency' },
          { id: 'outstanding', label: 'Outstanding (KWD)', labelAr: 'المتبقي', type: 'currency' },
          { id: 'lastSaleDate', label: 'Last Sale Date', labelAr: 'آخر تاريخ بيع', type: 'date' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: rows.map(r => ({
            ...r,
            lastSaleDate: r.lastSaleDate ? new Date(r.lastSaleDate).toISOString().slice(0, 10) : '-',
          })),
          totals: {
            totalSales: t.sales,
            totalPaid: t.paid,
            outstanding: t.outstanding,
          },
          kpis: [
            { label: 'Active Customers', labelAr: 'العملاء النشطون', value: total },
            { label: 'Total Invoiced', labelAr: 'إجمالي الفواتير', value: formatKWD(t.sales) + ' KWD' },
            { label: 'Total Collected', labelAr: 'إجمالي المحصل', value: formatKWD(t.paid) + ' KWD' },
            { label: 'Remaining Receivables', labelAr: 'المتبقي طرف العملاء', value: formatKWD(t.outstanding) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 3. SALES BY PRODUCT ────────────────────────
      case 'sales_by_product': {
        const conditions: string[] = [`s."status" != 'CANCELLED'`];
        const values: any[] = [];
        let idx = 1;

        if (params.startDate) {
          conditions.push(`s."sale_date" >= $${idx++}::timestamp`);
          values.push(params.startDate);
        }
        if (params.endDate) {
          conditions.push(`s."sale_date" <= $${idx++}::timestamp`);
          values.push(params.endDate);
        }
        if (params.categoryId) {
          conditions.push(`p."category_id" = $${idx++}`);
          values.push(params.categoryId);
        }
        if (params.search) {
          conditions.push(`(p."name" ILIKE $${idx} OR p."sku" ILIKE $${idx})`);
          values.push(`%${params.search}%`);
          idx++;
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            p.id,
            p.sku,
            p.name as "productName",
            cat.name as "categoryName",
            b.name as "brandName",
            COALESCE(SUM(si.quantity), 0)::float as "quantitySold",
            COALESCE(SUM(si.total), 0)::float as "revenue",
            COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0)::float as "cost",
            (COALESCE(SUM(si.total), 0) - COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0))::float as "profit",
            MAX(s.sale_date) as "lastSoldDate"
          FROM "sale_items" si
          JOIN "sales" s ON si.sale_id = s.id
          JOIN "products" p ON si.product_id = p.id
          LEFT JOIN "categories" cat ON p.category_id = cat.id
          LEFT JOIN "brands" b ON p.brand_id = b.id
          WHERE ${where}
          GROUP BY p.id, p.sku, p.name, cat.name, b.name
          ORDER BY "revenue" DESC
          LIMIT ${limit} OFFSET ${offset}
        `, ...values);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(DISTINCT p.id)::int as count
          FROM "sale_items" si
          JOIN "sales" s ON si.sale_id = s.id
          JOIN "products" p ON si.product_id = p.id
          WHERE ${where}
        `, ...values);
        const total = Number(countRes[0]?.count ?? 0);

        const totRes = await prisma.$queryRawUnsafe<[{ qty: number; revenue: number; cost: number }]>(`
          SELECT 
            COALESCE(SUM(si.quantity), 0)::float as qty,
            COALESCE(SUM(si.total), 0)::float as revenue,
            COALESCE(SUM(si.quantity * COALESCE(p.cost_price, 0)), 0)::float as cost
          FROM "sale_items" si
          JOIN "sales" s ON si.sale_id = s.id
          JOIN "products" p ON si.product_id = p.id
          WHERE ${where}
        `, ...values);
        const t = totRes[0] || { qty: 0, revenue: 0, cost: 0 };
        const totalProfit = t.revenue - t.cost;

        const columns = [
          { id: 'sku', label: 'SKU', labelAr: 'رمز الصنف', type: 'string' },
          { id: 'productName', label: 'Product Name', labelAr: 'اسم المنتج', type: 'string' },
          { id: 'categoryName', label: 'Category', labelAr: 'التصنيف', type: 'string' },
          { id: 'quantitySold', label: 'Qty Sold', labelAr: 'الكمية المباعة', type: 'number' },
          { id: 'revenue', label: 'Revenue (KWD)', labelAr: 'إجمالي الإيراد', type: 'currency' },
          { id: 'cost', label: 'Total Cost', labelAr: 'التكلفة', type: 'currency' },
          { id: 'profit', label: 'Gross Profit', labelAr: 'مجمل الربح', type: 'currency' },
          { id: 'margin', label: 'Margin %', labelAr: 'نسبة الربح', type: 'string' },
          { id: 'lastSoldDate', label: 'Last Sold Date', labelAr: 'آخر بيع', type: 'date' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: rows.map(r => {
            const marginVal = r.revenue > 0 ? (((r.revenue - r.cost) / r.revenue) * 100).toFixed(1) + '%' : '0.0%';
            return {
              ...r,
              margin: marginVal,
              lastSoldDate: r.lastSoldDate ? new Date(r.lastSoldDate).toISOString().slice(0, 10) : '-',
            };
          }),
          totals: {
            quantitySold: t.qty,
            revenue: t.revenue,
            cost: t.cost,
            profit: totalProfit,
          },
          kpis: [
            { label: 'Products Sold', labelAr: 'المنتجات المباعة', value: total },
            { label: 'Total Units Sold', labelAr: 'إجمالي الوحدات', value: t.qty },
            { label: 'Total Revenue', labelAr: 'إجمالي الإيراد', value: formatKWD(t.revenue) + ' KWD' },
            { label: 'Product Profit', labelAr: 'أرباح المنتجات', value: formatKWD(totalProfit) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 4. RECEIVABLES AGING ────────────────────────
      case 'receivables_aging': {
        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            c.id as "customerId",
            c.code as "customerCode",
            c.name as "customerName",
            c.phone as "customerPhone",
            s.id as "saleId",
            s.number as "invoiceNumber",
            s.sale_date as "saleDate",
            s.net_amount::float as "netAmount",
            s.paid_amount::float as "paidAmount",
            s.outstanding_amount::float as "outstandingAmount",
            (CURRENT_DATE - s.sale_date::date)::int as "daysOutstanding",
            CASE 
              WHEN (CURRENT_DATE - s.sale_date::date) <= 7 THEN '0-7 Days'
              WHEN (CURRENT_DATE - s.sale_date::date) <= 30 THEN '8-30 Days'
              WHEN (CURRENT_DATE - s.sale_date::date) <= 60 THEN '31-60 Days'
              WHEN (CURRENT_DATE - s.sale_date::date) <= 90 THEN '61-90 Days'
              ELSE '90+ Days'
            END as "agingBucket"
          FROM "sales" s
          JOIN "customers" c ON s.customer_id = c.id
          WHERE s."status" != 'CANCELLED' AND s."outstanding_amount" > 0
          ORDER BY "daysOutstanding" DESC, s.sale_date ASC
          LIMIT ${limit} OFFSET ${offset}
        `);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(*)::int as count 
          FROM "sales" 
          WHERE "status" != 'CANCELLED' AND "outstanding_amount" > 0
        `);
        const total = Number(countRes[0]?.count ?? 0);

        const bucketRes = await prisma.$queryRawUnsafe<[{
          b_0_7: number;
          b_8_30: number;
          b_31_60: number;
          b_61_90: number;
          b_90_plus: number;
          total: number;
        }]>(`
          SELECT 
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - sale_date::date) <= 7 THEN outstanding_amount ELSE 0 END), 0)::float as b_0_7,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - sale_date::date) BETWEEN 8 AND 30 THEN outstanding_amount ELSE 0 END), 0)::float as b_8_30,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - sale_date::date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END), 0)::float as b_31_60,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - sale_date::date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END), 0)::float as b_61_90,
            COALESCE(SUM(CASE WHEN (CURRENT_DATE - sale_date::date) > 90 THEN outstanding_amount ELSE 0 END), 0)::float as b_90_plus,
            COALESCE(SUM(outstanding_amount), 0)::float as total
          FROM "sales"
          WHERE "status" != 'CANCELLED' AND "outstanding_amount" > 0
        `);

        const b = bucketRes[0] || { b_0_7: 0, b_8_30: 0, b_31_60: 0, b_61_90: 0, b_90_plus: 0, total: 0 };

        const columns = [
          { id: 'invoiceNumber', label: 'Invoice #', labelAr: 'رقم الفاتورة', type: 'string' },
          { id: 'saleDate', label: 'Date', labelAr: 'التاريخ', type: 'date' },
          { id: 'customerName', label: 'Customer', labelAr: 'العميل', type: 'string' },
          { id: 'netAmount', label: 'Invoice Total', labelAr: 'قيمة الفاتورة', type: 'currency' },
          { id: 'paidAmount', label: 'Paid', labelAr: 'المسدد', type: 'currency' },
          { id: 'outstandingAmount', label: 'Outstanding (KWD)', labelAr: 'المتبقي', type: 'currency' },
          { id: 'daysOutstanding', label: 'Days Due', labelAr: 'عدد الأيام', type: 'number' },
          { id: 'agingBucket', label: 'Aging Bucket', labelAr: 'فئة العمر', type: 'badge' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: {},
          },
          columns,
          rows: rows.map(r => ({
            ...r,
            saleDate: r.saleDate ? new Date(r.saleDate).toISOString().slice(0, 10) : '-',
          })),
          totals: {
            outstandingAmount: b.total,
          },
          kpis: [
            { label: '0–7 Days (Current)', labelAr: '0–7 أيام', value: formatKWD(b.b_0_7) + ' KWD' },
            { label: '8–30 Days', labelAr: '8–30 يوم', value: formatKWD(b.b_8_30) + ' KWD' },
            { label: '31–60 Days', labelAr: '31–60 يوم', value: formatKWD(b.b_31_60) + ' KWD' },
            { label: '61–90 Days', labelAr: '61–90 يوم', value: formatKWD(b.b_61_90) + ' KWD' },
            { label: '90+ Days (Critical)', labelAr: 'أكثر من 90 يوم', value: formatKWD(b.b_90_plus) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 5. INVENTORY VALUATION ────────────────────────
      case 'inventory_valuation': {
        const conditions: string[] = [`p."is_active" = TRUE`];
        const values: any[] = [];
        let idx = 1;

        if (params.categoryId) {
          conditions.push(`p."category_id" = $${idx++}`);
          values.push(params.categoryId);
        }
        if (params.search) {
          conditions.push(`(p."name" ILIKE $${idx} OR p."sku" ILIKE $${idx})`);
          values.push(`%${params.search}%`);
          idx++;
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            p.id,
            p.sku,
            p.name as "productName",
            cat.name as "categoryName",
            b.name as "brandName",
            u.name as "unitName",
            p.stock_quantity::float as "stockQuantity",
            p.cost_price::float as "costPrice",
            p.selling_price::float as "sellingPrice",
            (p.stock_quantity * p.cost_price)::float as "valuation",
            (p.stock_quantity * p.selling_price)::float as "retailValuation",
            p.reorder_level::float as "minStockLevel"
          FROM "products" p
          LEFT JOIN "categories" cat ON p.category_id = cat.id
          LEFT JOIN "brands" b ON p.brand_id = b.id
          LEFT JOIN "units" u ON p.unit_id = u.id
          WHERE ${where}
          ORDER BY "valuation" DESC
          LIMIT ${limit} OFFSET ${offset}
        `, ...values);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(*)::int as count FROM "products" p WHERE ${where}
        `, ...values);
        const total = Number(countRes[0]?.count ?? 0);

        const totRes = await prisma.$queryRawUnsafe<[{ total_qty: number; total_cost_val: number; total_retail_val: number }]>(`
          SELECT 
            COALESCE(SUM(p.stock_quantity), 0)::float as total_qty,
            COALESCE(SUM(p.stock_quantity * p.cost_price), 0)::float as total_cost_val,
            COALESCE(SUM(p.stock_quantity * p.selling_price), 0)::float as total_retail_val
          FROM "products" p
          WHERE ${where}
        `, ...values);
        const t = totRes[0] || { total_qty: 0, total_cost_val: 0, total_retail_val: 0 };

        const columns = [
          { id: 'sku', label: 'SKU', labelAr: 'رمز الصنف', type: 'string' },
          { id: 'productName', label: 'Product Name', labelAr: 'اسم المنتج', type: 'string' },
          { id: 'categoryName', label: 'Category', labelAr: 'التصنيف', type: 'string' },
          { id: 'brandName', label: 'Brand', labelAr: 'الماركة', type: 'string' },
          { id: 'stockQuantity', label: 'Stock On Hand', labelAr: 'الكمية المتوفرة', type: 'number' },
          { id: 'unitName', label: 'Unit', labelAr: 'الوحدة', type: 'string' },
          { id: 'costPrice', label: 'Unit Cost', labelAr: 'تكلفة الوحدة', type: 'currency' },
          { id: 'valuation', label: 'Asset Valuation (KWD)', labelAr: 'قيمة المخزون بالتكلفة', type: 'currency' },
          { id: 'sellingPrice', label: 'Selling Price', labelAr: 'سعر البيع', type: 'currency' },
          { id: 'retailValuation', label: 'Retail Value (KWD)', labelAr: 'القيمة بسعر البيع', type: 'currency' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: {},
          },
          columns,
          rows,
          totals: {
            stockQuantity: t.total_qty,
            valuation: t.total_cost_val,
            retailValuation: t.total_retail_val,
          },
          kpis: [
            { label: 'Active SKUs', labelAr: 'عدد الأصناف', value: total },
            { label: 'Total Units in Stock', labelAr: 'إجمالي عدد القطع', value: t.total_qty },
            { label: 'Cost Valuation (Asset)', labelAr: 'تقييم المخزون (بالتكلفة)', value: formatKWD(t.total_cost_val) + ' KWD' },
            { label: 'Retail Market Value', labelAr: 'القيمة بسعر البيع', value: formatKWD(t.total_retail_val) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 6. LOW STOCK & REORDER ────────────────────────
      case 'low_stock_reorder': {
        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            p.id,
            p.sku,
            p.name as "productName",
            cat.name as "categoryName",
            p.stock_quantity::float as "stockQuantity",
            p.reorder_level::float as "minStockLevel",
            GREATEST(0, (p.reorder_level - p.stock_quantity))::float as "reorderQuantity",
            p.cost_price::float as "costPrice",
            (GREATEST(0, (p.reorder_level - p.stock_quantity)) * p.cost_price)::float as "estimatedReorderCost"
          FROM "products" p
          LEFT JOIN "categories" cat ON p.category_id = cat.id
          WHERE p."is_active" = TRUE AND p."stock_quantity" <= p."reorder_level"
          ORDER BY (p.stock_quantity - p.reorder_level) ASC
          LIMIT ${limit} OFFSET ${offset}
        `);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(*)::int as count 
          FROM "products" 
          WHERE "is_active" = TRUE AND "stock_quantity" <= "reorder_level"
        `);
        const total = Number(countRes[0]?.count ?? 0);

        const columns = [
          { id: 'sku', label: 'SKU', labelAr: 'رمز الصنف', type: 'string' },
          { id: 'productName', label: 'Product Name', labelAr: 'اسم المنتج', type: 'string' },
          { id: 'categoryName', label: 'Category', labelAr: 'التصنيف', type: 'string' },
          { id: 'stockQuantity', label: 'Current Stock', labelAr: 'المخزون الحالي', type: 'number' },
          { id: 'minStockLevel', label: 'Min Threshold', labelAr: 'حد الأمان', type: 'number' },
          { id: 'reorderQuantity', label: 'Suggested Order', labelAr: 'الكمية المقترح طلبها', type: 'number' },
          { id: 'estimatedReorderCost', label: 'Estimated Cost (KWD)', labelAr: 'التكلفة التقديرية', type: 'currency' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: {},
          },
          columns,
          rows,
          totals: {},
          kpis: [
            { label: 'Low Stock Products', labelAr: 'أصناف تحتاج شراء', value: total },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 7. PURCHASES SUMMARY ────────────────────────
      case 'purchases_summary': {
        const conditions: string[] = [`p."status" != 'CANCELLED'`];
        const values: any[] = [];
        let idx = 1;

        if (params.startDate) {
          conditions.push(`p."purchase_date" >= $${idx++}::timestamp`);
          values.push(params.startDate);
        }
        if (params.endDate) {
          conditions.push(`p."purchase_date" <= $${idx++}::timestamp`);
          values.push(params.endDate);
        }
        if (params.supplierId) {
          conditions.push(`p."supplier_id" = $${idx++}`);
          values.push(params.supplierId);
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            p.id,
            p.number,
            p.purchase_date as "purchaseDate",
            s.name as "supplierName",
            p.total_amount::float as "totalAmount",
            p.paid_amount::float as "paidAmount",
            p.outstanding_amount::float as "outstandingAmount",
            p.payment_status as "paymentStatus",
            p.status
          FROM "purchases" p
          JOIN "suppliers" s ON p.supplier_id = s.id
          WHERE ${where}
          ORDER BY p.purchase_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `, ...values);

        const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
          SELECT COUNT(*)::int as count FROM "purchases" p WHERE ${where}
        `, ...values);
        const total = Number(countRes[0]?.count ?? 0);

        const totRes = await prisma.$queryRawUnsafe<[{ total_amt: number; paid_amt: number; outstanding_amt: number }]>(`
          SELECT 
            COALESCE(SUM(p.total_amount), 0)::float as total_amt,
            COALESCE(SUM(p.paid_amount), 0)::float as paid_amt,
            COALESCE(SUM(p.outstanding_amount), 0)::float as outstanding_amt
          FROM "purchases" p
          WHERE ${where}
        `, ...values);
        const t = totRes[0] || { total_amt: 0, paid_amt: 0, outstanding_amt: 0 };

        const columns = [
          { id: 'number', label: 'Purchase #', labelAr: 'رقم الشراء', type: 'string' },
          { id: 'purchaseDate', label: 'Date', labelAr: 'التاريخ', type: 'date' },
          { id: 'supplierName', label: 'Supplier', labelAr: 'المورد', type: 'string' },
          { id: 'totalAmount', label: 'Total Amount (KWD)', labelAr: 'إجمالي الشراء', type: 'currency' },
          { id: 'paidAmount', label: 'Paid Amount (KWD)', labelAr: 'المسدد', type: 'currency' },
          { id: 'outstandingAmount', label: 'Payables (KWD)', labelAr: 'المستحق', type: 'currency' },
          { id: 'paymentStatus', label: 'Payment Status', labelAr: 'حالة السداد', type: 'badge' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: rows.map(r => ({
            ...r,
            purchaseDate: r.purchaseDate ? new Date(r.purchaseDate).toISOString().slice(0, 10) : '-',
          })),
          totals: {
            totalAmount: t.total_amt,
            paidAmount: t.paid_amt,
            outstandingAmount: t.outstanding_amt,
          },
          kpis: [
            { label: 'Total Purchases Count', labelAr: 'عدد فواتير الشراء', value: total },
            { label: 'Total Invoiced Value', labelAr: 'إجمالي المشتريات', value: formatKWD(t.total_amt) + ' KWD' },
            { label: 'Total Paid to Vendors', labelAr: 'المدفوع للموردين', value: formatKWD(t.paid_amt) + ' KWD' },
            { label: 'Outstanding Payables', labelAr: 'المستحق للموردين', value: formatKWD(t.outstanding_amt) + ' KWD' },
          ],
          meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        };
      }

      // ──────────────────────── 8. INCOME STATEMENT (P&L) ────────────────────────
      case 'income_statement': {
        const conditionsSale: string[] = [`"status" != 'CANCELLED'`];
        const conditionsExp: string[] = ['1=1'];
        const valuesSale: any[] = [];
        const valuesExp: any[] = [];
        let idxSale = 1;
        let idxExp = 1;

        if (params.startDate) {
          conditionsSale.push(`"sale_date" >= $${idxSale++}::timestamp`);
          valuesSale.push(params.startDate);
          conditionsExp.push(`"date" >= $${idxExp++}::timestamp`);
          valuesExp.push(params.startDate);
        }
        if (params.endDate) {
          conditionsSale.push(`"sale_date" <= $${idxSale++}::timestamp`);
          valuesSale.push(params.endDate);
          conditionsExp.push(`"date" <= $${idxExp++}::timestamp`);
          valuesExp.push(params.endDate);
        }

        const [salesRes, expRes, salRes] = await Promise.all([
          prisma.$queryRawUnsafe<[{ revenue: number; cost: number }]>(`
            SELECT 
              COALESCE(SUM(s.net_amount), 0)::float as revenue,
              COALESCE(SUM((
                SELECT SUM(si.quantity * COALESCE(p.cost_price, 0))
                FROM "sale_items" si 
                JOIN "products" p ON si.product_id = p.id 
                WHERE si.sale_id = s.id
              )), 0)::float as cost
            FROM "sales" s
            WHERE ${conditionsSale.join(' AND ')}
          `, ...valuesSale),

          prisma.$queryRawUnsafe<[{ total_exp: number }]>(`
            SELECT COALESCE(SUM("amount"), 0)::float as total_exp
            FROM "expenses"
            WHERE ${conditionsExp.join(' AND ')}
          `, ...valuesExp),

          prisma.$queryRawUnsafe<[{ total_sal: number }]>(`
            SELECT COALESCE(SUM("net_amount"), 0)::float as total_sal
            FROM "salary_records"
          `),
        ]);

        const revenue = Number(salesRes[0]?.revenue ?? 0);
        const cogs = Number(salesRes[0]?.cost ?? 0);
        const grossProfit = revenue - cogs;
        const operatingExpenses = Number(expRes[0]?.total_exp ?? 0);
        const payrollExpenses = Number(salRes[0]?.total_sal ?? 0);
        const totalExpenses = operatingExpenses + payrollExpenses;
        const netProfit = grossProfit - totalExpenses;
        const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) + '%' : '0.0%';

        const pnlRows = [
          { lineItem: '1. Revenue from Sales (Net Sales)', lineItemAr: 'إيرادات المبيعات (صافي المبيعات)', type: 'Income', amount: revenue },
          { lineItem: '2. Cost of Goods Sold (COGS)', lineItemAr: 'تكلفة البضاعة المباعة', type: 'Cost', amount: -cogs },
          { lineItem: '3. GROSS PROFIT', lineItemAr: 'إجمالي مجمل الربح', type: 'Summary', amount: grossProfit },
          { lineItem: '4. General & Operating Expenses', lineItemAr: 'المصروفات العمومية والتشغيلية', type: 'Expense', amount: -operatingExpenses },
          { lineItem: '5. Payroll & Salary Expenses', lineItemAr: 'الرواتب والأجور', type: 'Expense', amount: -payrollExpenses },
          { lineItem: '6. NET OPERATING PROFIT / (LOSS)', lineItemAr: 'صافي الربح / (الخسارة) التشغيلية', type: 'Summary', amount: netProfit },
        ];

        const columns = [
          { id: 'lineItem', label: 'Accounting Line Item', labelAr: 'البند المالي', type: 'string' },
          { id: 'type', label: 'Classification', labelAr: 'التصنيف', type: 'badge' },
          { id: 'amount', label: 'Amount (KWD)', labelAr: 'المبلغ', type: 'currency' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: pnlRows,
          totals: {
            amount: netProfit,
          },
          kpis: [
            { label: 'Net Sales Revenue', labelAr: 'إيراد المبيعات', value: formatKWD(revenue) + ' KWD' },
            { label: 'Gross Profit', labelAr: 'مجمل الربح', value: formatKWD(grossProfit) + ' KWD' },
            { label: 'Operating Expenses', labelAr: 'المصروفات الإجمالية', value: formatKWD(totalExpenses) + ' KWD' },
            { label: 'Net Profit', labelAr: 'صافي الربح النهائي', value: formatKWD(netProfit) + ' KWD' },
            { label: 'Net Profit Margin', labelAr: 'هامش الربح الصافي', value: netMargin },
          ],
          meta: { page: 1, limit: 20, total: pnlRows.length, totalPages: 1 },
        };
      }

      // ──────────────────────── 9. EXPENSE ANALYSIS ────────────────────────
      case 'expense_breakdown': {
        const conditions: string[] = ['1=1'];
        const values: any[] = [];
        let idx = 1;

        if (params.startDate) {
          conditions.push(`e."date" >= $${idx++}::timestamp`);
          values.push(params.startDate);
        }
        if (params.endDate) {
          conditions.push(`e."date" <= $${idx++}::timestamp`);
          values.push(params.endDate);
        }

        const where = conditions.join(' AND ');

        const rows = await prisma.$queryRawUnsafe<any[]>(`
          SELECT 
            ec.name as "categoryName",
            COUNT(e.id)::int as "expenseCount",
            COALESCE(SUM(e.amount), 0)::float as "totalAmount"
          FROM "expenses" e
          JOIN "expense_categories" ec ON e.category_id = ec.id
          WHERE ${where}
          GROUP BY ec.id, ec.name
          ORDER BY "totalAmount" DESC
        `, ...values);

        const totRes = await prisma.$queryRawUnsafe<[{ total: number }]>(`
          SELECT COALESCE(SUM("amount"), 0)::float as total FROM "expenses" e WHERE ${where}
        `, ...values);
        const grandTotal = Number(totRes[0]?.total ?? 0);

        const columns = [
          { id: 'categoryName', label: 'Expense Category', labelAr: 'بند المصروف', type: 'string' },
          { id: 'expenseCount', label: 'Count', labelAr: 'عدد الحركات', type: 'number' },
          { id: 'totalAmount', label: 'Total Amount (KWD)', labelAr: 'الإجمالي', type: 'currency' },
          { id: 'share', label: 'Percentage Share', labelAr: 'النسبة المئوية', type: 'string' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: { start: params.startDate, end: params.endDate },
          },
          columns,
          rows: rows.map(r => ({
            ...r,
            share: grandTotal > 0 ? ((r.totalAmount / grandTotal) * 100).toFixed(1) + '%' : '0.0%',
          })),
          totals: {
            totalAmount: grandTotal,
          },
          kpis: [
            { label: 'Total Expenditure', labelAr: 'إجمالي المصروفات', value: formatKWD(grandTotal) + ' KWD' },
            { label: 'Categories Count', labelAr: 'عدد البنود', value: rows.length },
          ],
          meta: { page: 1, limit: 100, total: rows.length, totalPages: 1 },
        };
      }

      // ──────────────────────── 10. EXECUTIVE BUSINESS PERFORMANCE ────────
      case 'executive_performance': {
        const overview = await ReportsService.getHubOverview();
        const netWorkingCapital = overview.cashBankLiquidity + overview.receivablesTotal - overview.payablesTotal;

        const executiveSummaryRows = [
          { metric: 'Gross Sales Revenue', metricAr: 'إجمالي المبيعات المحققة', value: overview.salesTotal, status: 'Healthy' },
          { metric: 'Gross Profit Generated', metricAr: 'مجمل الأرباح', value: overview.profitTotal, status: 'Healthy' },
          { metric: 'Accounts Receivable (Customers Owe)', metricAr: 'المديونيات طرف العملاء', value: overview.receivablesTotal, status: 'Pending Collection' },
          { metric: 'Accounts Payable (Owed to Suppliers)', metricAr: 'المستحقات للموردين', value: overview.payablesTotal, status: 'Due Obligation' },
          { metric: 'Current Inventory Asset Valuation', metricAr: 'قيمة أصول المخزون', value: overview.inventoryValuation, status: 'Asset' },
          { metric: 'Total Available Cash & Bank Liquidity', metricAr: 'السيولة المتاحة بالصناديق والبنوك', value: overview.cashBankLiquidity, status: 'Liquid Capital' },
          { metric: 'Net Working Capital Position', metricAr: 'صافي رأس المال العامل', value: netWorkingCapital, status: netWorkingCapital >= 0 ? 'Positive' : 'Deficit' },
        ];

        const columns = [
          { id: 'metric', label: 'Executive Performance Indicator', labelAr: 'المؤشر المالي والتنفيذي', type: 'string' },
          { id: 'value', label: 'Value (KWD)', labelAr: 'القيمة', type: 'currency' },
          { id: 'status', label: 'Status', labelAr: 'الحالة', type: 'badge' },
        ];

        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: {},
          },
          columns,
          rows: executiveSummaryRows,
          totals: {},
          kpis: [
            { label: 'Available Cash & Bank', labelAr: 'السيولة النقدية', value: formatKWD(overview.cashBankLiquidity) + ' KWD' },
            { label: 'Net Working Capital', labelAr: 'رأس المال العامل', value: formatKWD(netWorkingCapital) + ' KWD' },
            { label: 'Total Inventory Assets', labelAr: 'أصول البضاعة', value: formatKWD(overview.inventoryValuation) + ' KWD' },
          ],
          meta: { page: 1, limit: 20, total: executiveSummaryRows.length, totalPages: 1 },
        };
      }

      // Default fallback handler for other catalog reports
      default: {
        return {
          metadata: {
            id: reportId,
            nameEn: metaInfo.nameEn,
            nameAr: metaInfo.nameAr,
            generatedAt: new Date().toISOString(),
            period: {},
          },
          columns: [
            { id: 'id', label: 'Record ID', labelAr: 'المعرف', type: 'string' },
            { id: 'info', label: 'Information', labelAr: 'البيان', type: 'string' },
          ],
          rows: [],
          totals: {},
          kpis: [],
          meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
        };
      }
    }
  },

  // ── Custom Report Builder Execution Engine ──────────────────────────────────
  async runCustomReport(payload: {
    dataSource: string;
    columns: string[];
    filters?: { field: string; operator: string; value: any }[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<{
    columns: { id: string; label: string; type: string }[];
    rows: Record<string, any>[];
    totals: Record<string, any>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const ds = DATA_SOURCES[payload.dataSource];
    if (!ds) {
      throw new Error(`Invalid data source: ${payload.dataSource}`);
    }

    const page = Math.max(1, payload.page ?? 1);
    const limit = Math.min(250, Math.max(1, payload.limit ?? 50));
    const offset = (page - 1) * limit;

    // Filter requested columns to valid allowlisted fields
    const validFields = ds.fields.filter(f => payload.columns.includes(f.id));
    const selectedColumns = validFields.length > 0 ? validFields : ds.fields.slice(0, 6);

    let tableName = 'sales';
    if (payload.dataSource === 'purchases') tableName = 'purchases';
    else if (payload.dataSource === 'inventory') tableName = 'products';
    else if (payload.dataSource === 'customers') tableName = 'customers';
    else if (payload.dataSource === 'suppliers') tableName = 'suppliers';
    else if (payload.dataSource === 'expenses') tableName = 'expenses';
    else if (payload.dataSource === 'quotations') tableName = 'quotations';
    else if (payload.dataSource === 'delivery_orders') tableName = 'delivery_orders';

    // Build parameterized query safely
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let idx = 1;

    if (payload.filters && Array.isArray(payload.filters)) {
      for (const f of payload.filters) {
        if (!f.field || f.value === undefined || f.value === '') continue;
        const matchField = ds.fields.find(field => field.id === f.field);
        if (!matchField) continue;

        const col = `"${f.field}"`;
        if (f.operator === 'equals') {
          conditions.push(`${col} = $${idx++}`);
          values.push(f.value);
        } else if (f.operator === 'contains') {
          conditions.push(`${col}::text ILIKE $${idx++}`);
          values.push(`%${f.value}%`);
        } else if (f.operator === 'greater_than') {
          conditions.push(`${col} >= $${idx++}`);
          values.push(f.value);
        } else if (f.operator === 'less_than') {
          conditions.push(`${col} <= $${idx++}`);
          values.push(f.value);
        }
      }
    }

    const where = conditions.join(' AND ');
    const countRes = await prisma.$queryRawUnsafe<[{ count: number | string }]>(`
      SELECT COUNT(*)::int as count FROM "${tableName}" WHERE ${where}
    `, ...values);
    const total = Number(countRes[0]?.count ?? 0);

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "${tableName}" 
      WHERE ${where} 
      LIMIT ${limit} OFFSET ${offset}
    `, ...values);

    const columns = selectedColumns.map(c => ({
      id: c.id,
      label: c.nameEn,
      type: c.type,
    }));

    return {
      columns,
      rows: rows.map(r => {
        const out: Record<string, any> = {};
        for (const c of selectedColumns) {
          out[c.id] = r[c.id] ?? r[c.id.replace(/([A-Z])/g, '_$1').toLowerCase()] ?? '-';
        }
        return out;
      }),
      totals: {},
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // ── Saved Reports CRUD ──────────────────────────────────────────────────────
  async getSavedReports(userId: string): Promise<any[]> {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.category,
        r.data_source as "dataSource",
        r.config,
        r.is_shared as "isShared",
        r.created_by_id as "createdById",
        u.name as "createdByName",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt"
      FROM "saved_reports" r
      JOIN "users" u ON r.created_by_id = u.id
      WHERE r.created_by_id = $1 OR r.is_shared = TRUE
      ORDER BY r.updated_at DESC
    `, userId);
  },

  async createSavedReport(userId: string, data: {
    name: string;
    description?: string;
    category: string;
    dataSource: string;
    config: any;
    isShared?: boolean;
  }): Promise<any> {
    const id = 'rep_' + Math.random().toString(36).slice(2, 11);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "saved_reports" (
        "id", "name", "description", "category", "data_source", "config", "is_shared", "created_by_id", "created_at", "updated_at"
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, NOW(), NOW())
    `, id, data.name, data.description || null, data.category, data.dataSource, JSON.stringify(data.config), Boolean(data.isShared), userId);

    return { id, ...data, isShared: Boolean(data.isShared), createdById: userId };
  },

  async deleteSavedReport(id: string, userId: string, isSuperAdmin: boolean): Promise<void> {
    if (isSuperAdmin) {
      await prisma.$executeRawUnsafe(`DELETE FROM "saved_reports" WHERE "id" = $1`, id);
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM "saved_reports" WHERE "id" = $1 AND "created_by_id" = $2`, id, userId);
    }
  },

  // ── Report Execution Audit Logging ──────────────────────────────────────────
  async logExecution(params: {
    reportType: string;
    reportName: string;
    userId: string;
    filters?: any;
    durationMs: number;
    rowCount: number;
    format: string;
  }): Promise<void> {
    const id = 'log_' + Math.random().toString(36).slice(2, 11);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "report_execution_logs" (
        "id", "report_type", "report_name", "user_id", "filters", "duration_ms", "row_count", "format", "created_at"
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, NOW())
    `, id, params.reportType, params.reportName, params.userId, JSON.stringify(params.filters || {}), params.durationMs, params.rowCount, params.format);
  },
};
