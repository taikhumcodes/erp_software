import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DashboardService {
  /**
   * Executive KPIs
   */
  async getKPIs(startDate: Date, endDate: Date) {
    const [sales, purchases, receivables, payables, activeCustomers, activeSuppliers, completedPayments] = await Promise.all([
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
      }),
      prisma.payment.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where: { status: 'COMPLETED', paymentDate: { lte: endDate } }
      })
    ]);

    // Calculate Cash Balance based on completed payments up to endDate
    let cashBalance = 0;
    completedPayments.forEach(p => {
      if (p.type === 'CUSTOMER') cashBalance += Number(p._sum.amount || 0);
      if (p.type === 'SUPPLIER') cashBalance -= Number(p._sum.amount || 0);
    });

    const inventoryValueResult = await prisma.$queryRaw<[{ totalValue: number }]>`
      SELECT COALESCE(SUM(stock_quantity * cost_price), 0) as "totalValue"
      FROM products
      WHERE is_active = true
    `;
    const inventoryValue = Number(inventoryValueResult[0]?.totalValue || 0);

    const pendingDeliveries = await prisma.deliveryOrder.count({
      where: { status: { in: ['DRAFT', 'APPROVED', 'DISPATCHED'] } }
    });

    const products = await prisma.product.count({ where: { isActive: true } });

    const totalRevenue = Number(sales._sum.netAmount || 0);
    const totalCost = Number(purchases._sum.netAmount || 0);

    return {
      sales: {
        totalRevenue,
        totalCollections: Number(sales._sum.paidAmount || 0),
        outstanding: Number(sales._sum.outstandingAmount || 0)
      },
      purchases: {
        totalCost,
        totalPayments: Number(purchases._sum.paidAmount || 0),
        outstanding: Number(purchases._sum.outstandingAmount || 0)
      },
      profit: {
        grossProfit: totalRevenue - totalCost,
        netProfit: totalRevenue - totalCost // simplified for Phase 2
      },
      balances: {
        cashBalance,
        bankBalance: 0, // Placeholder
        inventoryValue
      },
      receivables: Number(receivables._sum.balance || 0),
      payables: Number(payables._sum.balance || 0),
      counts: {
        customers: activeCustomers,
        suppliers: activeSuppliers,
        products,
        pendingDeliveries
      }
    };
  }

  /**
   * Financial Analytics
   */
  async getFinancialAnalytics(startDate: Date, endDate: Date) {
    const sales = await prisma.sale.findMany({
      where: { saleDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      select: { saleDate: true, netAmount: true, paidAmount: true }
    });

    const purchases = await prisma.purchase.findMany({
      where: { purchaseDate: { gte: startDate, lte: endDate }, status: { not: 'CANCELLED' } },
      select: { purchaseDate: true, netAmount: true, paidAmount: true }
    });

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

    const chartData = Array.from(chartMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Profit margin trend (simulated over periods based on data)
    const profitMarginTrend = chartData.map(d => ({
      date: d.date,
      margin: d.revenue > 0 ? ((d.revenue - d.expense) / d.revenue) * 100 : 0
    }));

    return {
      revenueVsExpense: chartData,
      profitMarginTrend
    };
  }

  /**
   * Customer Analytics
   */
  async getCustomerAnalytics(startDate: Date, endDate: Date) {
    const topCustomers = await prisma.$queryRaw<any[]>`
      SELECT c.id, c.name, 
             COALESCE(SUM(s.net_amount), 0) as "totalRevenue",
             COALESCE(SUM(s.outstanding_amount), 0) as "outstanding",
             MAX(s.sale_date) as "lastPurchase",
             COUNT(s.id) as "orderCount",
             c.is_active as "isActive"
      FROM customers c
      LEFT JOIN sales s ON c.id = s.customer_id AND s.sale_date >= ${startDate} AND s.sale_date <= ${endDate} AND s.status != 'CANCELLED'
      GROUP BY c.id
      ORDER BY "totalRevenue" DESC
      LIMIT 10
    `;

    return topCustomers.map(c => ({
      id: c.id,
      name: c.name,
      totalRevenue: Number(c.totalRevenue),
      outstanding: Number(c.outstanding),
      lastPurchase: c.lastPurchase,
      orderCount: Number(c.orderCount),
      status: c.isActive ? 'Active' : 'Inactive',
      avgOrderValue: Number(c.orderCount) > 0 ? Number(c.totalRevenue) / Number(c.orderCount) : 0
    }));
  }

  /**
   * Supplier Analytics
   */
  async getSupplierAnalytics(startDate: Date, endDate: Date) {
    const topSuppliers = await prisma.$queryRaw<any[]>`
      SELECT s.id, s.name, 
             COALESCE(SUM(p.net_amount), 0) as "totalPurchases",
             COALESCE(SUM(p.outstanding_amount), 0) as "outstanding",
             MAX(p.purchase_date) as "lastPurchase",
             s.is_active as "isActive"
      FROM suppliers s
      LEFT JOIN purchases p ON s.id = p.supplier_id AND p.purchase_date >= ${startDate} AND p.purchase_date <= ${endDate} AND p.status != 'CANCELLED'
      GROUP BY s.id
      ORDER BY "totalPurchases" DESC
      LIMIT 10
    `;

    return topSuppliers.map(s => ({
      id: s.id,
      name: s.name,
      totalPurchases: Number(s.totalPurchases),
      outstanding: Number(s.outstanding),
      lastPurchase: s.lastPurchase,
      status: s.isActive ? 'Active' : 'Inactive'
    }));
  }

  /**
   * Sales & Product Performance Analytics
   */
  async getSalesAnalytics(startDate: Date, endDate: Date) {
    const topProducts = await prisma.$queryRaw<any[]>`
      SELECT p.id, p.name, p.sku, p.stock_quantity as "currentStock",
             COALESCE(SUM(si.quantity), 0) as "unitsSold",
             COALESCE(SUM(si.total), 0) as "revenue",
             COALESCE(SUM(si.total) - SUM(si.quantity * p.cost_price), 0) as "profit"
      FROM products p
      JOIN sale_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.sale_date >= ${startDate} AND s.sale_date <= ${endDate} AND s.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY "revenue" DESC
      LIMIT 15
    `;

    return {
      topProducts: topProducts.map(p => ({
        ...p,
        currentStock: Number(p.currentStock),
        unitsSold: Number(p.unitsSold),
        revenue: Number(p.revenue),
        profit: Number(p.profit)
      }))
    };
  }

  /**
   * Inventory Intelligence (Dynamic Parameterized SQL)
   */
  async getInventoryIntelligence(startDate: Date, endDate: Date) {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) diffDays = 1;

    const inventoryStats: any[] = await prisma.$queryRaw`
      SELECT 
        p.id, p.sku, p.name, 
        p.stock_quantity as "stockQuantity", 
        p.cost_price as "costPrice",
        p.selling_price as "sellingPrice",
        p.reorder_level as "safetyStock",
        COALESCE(SUM(si.quantity) / ${diffDays}::numeric, 0) as "avgDailySales",
        MAX(s.sale_date) as "lastSaleDate"
      FROM products p
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id 
        AND s.sale_date >= ${startDate} 
        AND s.sale_date <= ${endDate}
        AND s.status != 'CANCELLED'
      WHERE p.is_active = true
      GROUP BY p.id, p.sku, p.name, p.stock_quantity, p.cost_price, p.selling_price, p.reorder_level
      ORDER BY "avgDailySales" DESC
    `;

    let totalValue = 0, totalCost = 0, lowStockCount = 0, outOfStockCount = 0, totalStockQty = 0;
    
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const stockCoverage = inventoryStats.map(item => {
      const stock = Number(item.stockQuantity);
      const cost = Number(item.costPrice);
      const price = Number(item.sellingPrice);
      const ads = Number(item.avgDailySales);
      const safetyStock = Number(item.safetyStock) || 0;
      const leadTime = 7; // Estimated for Phase 2
      
      totalValue += stock * price;
      totalCost += stock * cost;
      totalStockQty += stock;
      if (stock <= 0) outOfStockCount++;
      
      let status = 'Healthy';
      let daysRemaining = 999;
      let isDeadStock = false;
      let deadStockRecommendation = 'None';
      let deadStockDuration = 'None';
      
      let reorderRecommendation = 'None';
      let priority = 'Low';

      if (stock <= 0) {
        status = 'Out of Stock';
        daysRemaining = 0;
        reorderRecommendation = 'Immediate Purchase';
        priority = 'Critical';
      } else if (ads > 0) {
        daysRemaining = stock / ads;
        if (daysRemaining <= leadTime) {
          status = 'Critical';
          lowStockCount++;
          reorderRecommendation = 'Urgent Purchase';
          priority = 'High';
        }
        else if (daysRemaining <= leadTime + safetyStock) {
          status = 'Reorder Soon';
          lowStockCount++;
          reorderRecommendation = 'Plan Purchase';
          priority = 'Medium';
        }
        else if (daysRemaining < 30) status = 'Monitor';
        else if (daysRemaining > 60) status = 'Overstock';
      } else {
        status = 'Overstock'; 
        if (!item.lastSaleDate || new Date(item.lastSaleDate) < thirtyDaysAgo) {
          isDeadStock = true;
          deadStockDuration = !item.lastSaleDate || new Date(item.lastSaleDate) < sixtyDaysAgo ? '> 60 Days' : '> 30 Days';
          deadStockRecommendation = deadStockDuration === '> 60 Days' ? 'Stop Purchasing' : 'Reduce Price / Bundle';
        }
      }

      return {
        id: item.id, sku: item.sku, name: item.name,
        stockQuantity: stock, avgDailySales: ads,
        daysRemaining: Math.round(daysRemaining),
        status, isDeadStock, deadStockRecommendation, deadStockDuration,
        inventoryValue: stock * cost,
        reorderRecommendation, priority,
        minimumStock: safetyStock + (leadTime * ads),
        lastSaleDate: item.lastSaleDate
      };
    });

    return {
      summary: { totalValue, totalCost, totalStockQty, lowStockCount, outOfStockCount },
      topMovingProducts: stockCoverage.filter(s => s.avgDailySales > 0).slice(0, 10),
      deadStock: stockCoverage.filter(s => s.isDeadStock).slice(0, 20),
      lowStock: stockCoverage.filter(s => ['Critical', 'Reorder Soon'].includes(s.status)).slice(0, 20),
      stockCoverage 
    };
  }

  /**
   * Receivables & Payables Center
   */
  async getFinancialCenters() {
    const now = new Date();
    const calculateBrackets = (docs: any[], dateField: string) => {
      let b0_30 = 0, b31_60 = 0, b61_90 = 0, b90Plus = 0;
      docs.forEach(doc => {
        const days = Math.floor((now.getTime() - new Date(doc[dateField]).getTime()) / (1000 * 60 * 60 * 24));
        const amount = Number(doc.outstandingAmount || 0);
        if (days <= 30) b0_30 += amount;
        else if (days <= 60) b31_60 += amount;
        else if (days <= 90) b61_90 += amount;
        else b90Plus += amount;
      });
      return { b0_30, b31_60, b61_90, b90Plus };
    };

    const receivables = await prisma.customer.findMany({
      where: { balance: { gt: 0 }, isActive: true },
      select: { 
        id: true, name: true, balance: true, 
        _count: { select: { sales: { where: { paymentStatus: { not: 'PAID' } } } } },
        sales: { 
          where: { paymentStatus: { not: 'PAID' }, status: { in: ['CONFIRMED', 'DELIVERED'] } },
          select: { saleDate: true, outstandingAmount: true }
        }
      },
      orderBy: { balance: 'desc' }, take: 15
    });

    const payables = await prisma.supplier.findMany({
      where: { balance: { gt: 0 }, isActive: true },
      select: { 
        id: true, name: true, balance: true, 
        _count: { select: { purchases: { where: { paymentStatus: { not: 'PAID' } } } } },
        purchases: {
          where: { paymentStatus: { not: 'PAID' }, status: { in: ['CONFIRMED', 'RECEIVED'] } },
          select: { purchaseDate: true, outstandingAmount: true }
        }
      },
      orderBy: { balance: 'desc' }, take: 15
    });

    return {
      receivables: receivables.map(r => {
        const brackets = calculateBrackets(r.sales, 'saleDate');
        return { ...r, balance: Number(r.balance), invoices: r._count.sales, brackets };
      }),
      payables: payables.map(p => {
        const brackets = calculateBrackets(p.purchases, 'purchaseDate');
        return { ...p, balance: Number(p.balance), bills: p._count.purchases, brackets };
      })
    };
  }

  /**
   * Action Center & Activity
   */
  async getOperations(startDate: Date, endDate: Date) {
    const pendingDeliveries = await prisma.deliveryOrder.findMany({
      where: { status: { in: ['DRAFT', 'APPROVED', 'DISPATCHED'] } },
      orderBy: { createdAt: 'desc' }, take: 10,
      include: { customer: { select: { name: true } } }
    });

    const recentSales = await prisma.sale.findMany({
      where: { saleDate: { gte: startDate, lte: endDate } },
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { user: { select: { name: true } }, customer: { select: { name: true } } }
    });

    const pendingQuotations = await prisma.quotation.findMany({
      where: { status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] } },
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { customer: { select: { name: true } } }
    });

    const activity = recentSales.map(s => ({
      id: s.id, module: 'Sales', description: `New Sale ${s.number} created`,
      user: s.user.name, entity: s.customer.name, amount: Number(s.netAmount),
      time: s.createdAt, status: s.status
    })).sort((a, b) => b.time.getTime() - a.time.getTime());

    // Generate alerts
    const alerts = [];
    const inv = await this.getInventoryIntelligence(startDate, endDate);
    if (inv.summary.outOfStockCount > 0) alerts.push({ severity: 'Critical', message: `${inv.summary.outOfStockCount} products out of stock`, type: 'OUT_OF_STOCK', items: inv.stockCoverage.filter(s => s.stockQuantity <= 0) });
    if (inv.summary.lowStockCount > 0) alerts.push({ severity: 'High', message: `${inv.summary.lowStockCount} products are running low`, type: 'LOW_STOCK', items: inv.lowStock });
    
    return {
      pendingDeliveries: pendingDeliveries.map(d => ({
        id: d.id, number: d.number, customer: d.customerNameSnapshot || d.customer?.name,
        status: d.status, date: d.deliveryDate || d.createdAt
      })),
      pendingQuotations: pendingQuotations.map(q => ({
        id: q.id, number: q.number, customer: q.customer?.name,
        status: q.status, date: q.quotationDate || q.createdAt, amount: Number(q.grandTotal)
      })),
      recentActivity: activity,
      alerts
    };
  }

  /**
   * Business Health & AI Insights (Rule-based)
   */
  async getBusinessHealth(startDate: Date, endDate: Date) {
    const kpis = await this.getKPIs(startDate, endDate);
    let score = 100;
    
    if (kpis.profit.netProfit < 0) score -= 20;
    if (kpis.receivables > kpis.sales.totalRevenue * 0.3) score -= 10;
    if (kpis.balances.cashBalance < kpis.payables) score -= 15;
    
    const insights = [];
    if (kpis.profit.netProfit > 0) insights.push('Profitability is positive for the period.');
    else insights.push('Business is operating at a loss for the period.');
    
    if (kpis.balances.cashBalance < kpis.payables) insights.push('Cash balance is lower than total payables. Liquidity risk detected.');
    else insights.push('Cash flow is healthy.');

    return {
      score: Math.max(0, score),
      status: score > 80 ? 'Healthy' : score > 50 ? 'Average' : 'Critical',
      insights
    };
  }
}

export const dashboardService = new DashboardService();
