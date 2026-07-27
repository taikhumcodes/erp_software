import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  /**
   * Executive KPIs
   */
  async getKPIs(startDate: Date, endDate: Date) {
    const [sales, purchases, receivables, payables, activeCustomers, activeSuppliers] = await Promise.all([
      prisma.sale.aggregate({
        _sum: { netAmount: true, paidAmount: true, outstandingAmount: true },
        where: { saleDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } }
      }),
      prisma.purchase.aggregate({
        _sum: { netAmount: true, paidAmount: true, outstandingAmount: true },
        where: { purchaseDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } }
      }),
      prisma.customer.aggregate({
        _sum: { balance: true },
      }),
      prisma.supplier.aggregate({
        _sum: { balance: true },
      }),
      prisma.customer.count({
        where: { isActive: true }
      }),
      prisma.supplier.count({
        where: { isActive: true }
      })
    ]);

    // Format output
    return {
      sales: {
        totalRevenue: sales._sum.netAmount || 0,
        totalCollections: sales._sum.paidAmount || 0,
        outstanding: sales._sum.outstandingAmount || 0
      },
      purchases: {
        totalCost: purchases._sum.netAmount || 0,
        totalPayments: purchases._sum.paidAmount || 0,
        outstanding: purchases._sum.outstandingAmount || 0
      },
      profit: {
        grossProfit: Number(sales._sum.netAmount || 0) - Number(purchases._sum.netAmount || 0)
      },
      receivables: receivables._sum.balance || 0,
      payables: payables._sum.balance || 0,
      counts: {
        customers: activeCustomers,
        suppliers: activeSuppliers
      }
    };
  }

  /**
   * Inventory Intelligence (Dynamic Parameterized SQL)
   */
  async getInventoryIntelligence(startDate: Date, endDate: Date) {
    // Calculate the difference in days between startDate and endDate
    // to use as the divisor for average daily sales. Ensure minimum of 1 day to avoid division by zero.
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) diffDays = 1;

    // Use raw SQL to calculate Average Daily Sales dynamically based on the date range
    const inventoryStats: any[] = await prisma.$queryRaw`
      SELECT 
        p.id, 
        p.sku,
        p.name, 
        p.stock_quantity as "stockQuantity", 
        p.cost_price as "costPrice",
        p.selling_price as "sellingPrice",
        COALESCE(SUM(si.quantity) / ${diffDays}::numeric, 0) as "avgDailySales"
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id 
        AND s.sale_date >= ${startDate} 
        AND s.sale_date <= ${endDate}
        AND s.status != 'CANCELLED'
      WHERE p.is_active = true
      GROUP BY p.id, p.sku, p.name, p.stock_quantity, p.cost_price, p.selling_price
      ORDER BY "avgDailySales" DESC
    `;

    // Process and categorize logic
    let totalValue = 0;
    let totalCost = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalStockQty = 0;

    const stockCoverage = inventoryStats.map(item => {
      const stock = Number(item.stockQuantity);
      const cost = Number(item.costPrice);
      const price = Number(item.sellingPrice);
      const ads = Number(item.avgDailySales);
      
      totalValue += stock * price;
      totalCost += stock * cost;
      totalStockQty += stock;

      if (stock <= 0) outOfStockCount++;
      
      let status = 'Healthy';
      let daysRemaining = 999;

      if (stock <= 0) {
        status = 'Out of Stock';
        daysRemaining = 0;
      } else if (ads > 0) {
        daysRemaining = stock / ads;
        if (daysRemaining < 7) {
          status = 'Critical';
          lowStockCount++;
        }
        else if (daysRemaining < 15) {
          status = 'Reorder Soon';
          lowStockCount++;
        }
        else if (daysRemaining < 30) status = 'Monitor';
        else if (daysRemaining > 60) status = 'Overstock';
      } else {
        status = 'Overstock'; // Stock exists but no sales in period
      }

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        stockQuantity: stock,
        avgDailySales: ads,
        daysRemaining: Math.round(daysRemaining),
        status
      };
    });

    return {
      summary: {
        totalValue,
        totalCost,
        totalStockQty,
        lowStockCount,
        outOfStockCount
      },
      topMovingProducts: stockCoverage.slice(0, 10), // Top 10 by ADS (already sorted by SQL)
      stockCoverage // Full list
    };
  }

  /**
   * Analytics & Charts
   */
  async getCharts(startDate: Date, endDate: Date) {
    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      select: { saleDate: true, netAmount: true, paidAmount: true }
    });

    const purchases = await prisma.purchase.findMany({
      where: { purchaseDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      select: { purchaseDate: true, netAmount: true, paidAmount: true }
    });

    // Grouping by Date (YYYY-MM-DD)
    const chartMap = new Map<string, { date: string; revenue: number; expense: number; collections: number; payments: number }>();

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    sales.forEach(s => {
      const dateStr = formatDate(s.saleDate);
      if (!chartMap.has(dateStr)) chartMap.set(dateStr, { date: dateStr, revenue: 0, expense: 0, collections: 0, payments: 0 });
      const entry = chartMap.get(dateStr)!;
      entry.revenue += Number(s.netAmount);
      entry.collections += Number(s.paidAmount);
    });

    purchases.forEach(p => {
      const dateStr = formatDate(p.purchaseDate);
      if (!chartMap.has(dateStr)) chartMap.set(dateStr, { date: dateStr, revenue: 0, expense: 0, collections: 0, payments: 0 });
      const entry = chartMap.get(dateStr)!;
      entry.expense += Number(p.netAmount);
      entry.payments += Number(p.paidAmount);
    });

    const revenueVsExpense = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      revenueVsExpense
    };
  }

  /**
   * Operations & Alerts
   */
  async getOperations(startDate: Date, endDate: Date) {
    const pendingDeliveries = await prisma.deliveryOrder.findMany({
      where: { status: { in: ['DRAFT', 'APPROVED', 'DISPATCHED'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { customer: { select: { name: true } } }
    });

    const recentSales = await prisma.sale.findMany({
      where: { saleDate: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    });

    const recentPurchases = await prisma.purchase.findMany({
      where: { purchaseDate: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true } } }
    });

    const activity = [
      ...recentSales.map(s => ({
        id: s.id,
        module: 'Sales',
        description: `New Sale ${s.number} created`,
        user: s.user.name,
        time: s.createdAt,
        status: s.status
      })),
      ...recentPurchases.map(p => ({
        id: p.id,
        module: 'Purchases',
        description: `New Purchase ${p.number} created`,
        user: p.user.name,
        time: p.createdAt,
        status: p.status
      }))
    ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 10);

    return {
      pendingDeliveries: pendingDeliveries.map(d => ({
        id: d.id,
        number: d.number,
        customer: d.customerNameSnapshot || d.customer?.name,
        status: d.status,
        date: d.deliveryDate || d.createdAt
      })),
      recentActivity: activity
    };
  }
}

export const dashboardService = new DashboardService();
