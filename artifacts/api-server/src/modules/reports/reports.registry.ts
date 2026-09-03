export type FieldType = 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'badge';

export interface FieldDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  type: FieldType;
  sortable?: boolean;
  filterable?: boolean;
  aggregable?: boolean; // Can be summed/averaged
}

export interface DataSourceDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  descriptionEn: string;
  descriptionAr: string;
  requiredRoles: string[]; // Roles that can query this source
  fields: FieldDefinition[];
}

export const DATA_SOURCES: Record<string, DataSourceDefinition> = {
  sales: {
    id: 'sales',
    nameEn: 'Sales & Invoices',
    nameAr: 'المبيعات والفواتير',
    category: 'SALES',
    descriptionEn: 'Sales invoices, customers, gross revenue, net amounts, and payments',
    descriptionAr: 'فواتير المبيعات، العملاء، الإيرادات الإجمالية، وصافي المبالغ',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
    fields: [
      { id: 'number', nameEn: 'Invoice Number', nameAr: 'رقم الفاتورة', type: 'string', sortable: true, filterable: true },
      { id: 'saleDate', nameEn: 'Invoice Date', nameAr: 'تاريخ الفاتورة', type: 'date', sortable: true, filterable: true },
      { id: 'customerName', nameEn: 'Customer Name', nameAr: 'اسم العميل', type: 'string', sortable: true, filterable: true },
      { id: 'userName', nameEn: 'Salesperson', nameAr: 'مسؤول المبيعات', type: 'string', sortable: true, filterable: true },
      { id: 'totalAmount', nameEn: 'Gross Amount', nameAr: 'المبلغ الإجمالي', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'discount', nameEn: 'Discount', nameAr: 'الخصم', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'netAmount', nameEn: 'Net Amount', nameAr: 'صافي المبلغ', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'paidAmount', nameEn: 'Paid Amount', nameAr: 'المبلغ المدفوع', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'outstandingAmount', nameEn: 'Outstanding Balance', nameAr: 'الرصيد المتبقي', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'paymentStatus', nameEn: 'Payment Status', nameAr: 'حالة الدفع', type: 'badge', sortable: true, filterable: true },
      { id: 'status', nameEn: 'Invoice Status', nameAr: 'حالة الفاتورة', type: 'badge', sortable: true, filterable: true },
      { id: 'customerPONumber', nameEn: 'Customer PO', nameAr: 'طلب شراء العميل', type: 'string', sortable: true, filterable: true },
    ],
  },
  purchases: {
    id: 'purchases',
    nameEn: 'Purchases & Bills',
    nameAr: 'المشتريات وفواتير الموردين',
    category: 'PURCHASES',
    descriptionEn: 'Purchase orders, supplier bills, received items, and payables',
    descriptionAr: 'أوامر الشراء، فواتير الموردين، الأصناف المستلمة والمدفوعات',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
    fields: [
      { id: 'number', nameEn: 'Purchase Number', nameAr: 'رقم الشراء', type: 'string', sortable: true, filterable: true },
      { id: 'purchaseDate', nameEn: 'Purchase Date', nameAr: 'تاريخ الشراء', type: 'date', sortable: true, filterable: true },
      { id: 'supplierName', nameEn: 'Supplier Name', nameAr: 'اسم المورد', type: 'string', sortable: true, filterable: true },
      { id: 'totalAmount', nameEn: 'Total Amount', nameAr: 'إجمالي الشراء', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'paidAmount', nameEn: 'Paid Amount', nameAr: 'المبلغ المدفوع', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'outstandingAmount', nameEn: 'Outstanding Payables', nameAr: 'الرصيد المستحق', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'paymentStatus', nameEn: 'Payment Status', nameAr: 'حالة السداد', type: 'badge', sortable: true, filterable: true },
      { id: 'status', nameEn: 'Status', nameAr: 'الحالة', type: 'badge', sortable: true, filterable: true },
    ],
  },
  inventory: {
    id: 'inventory',
    nameEn: 'Inventory & Stock',
    nameAr: 'المخزون والمنتجات',
    category: 'INVENTORY',
    descriptionEn: 'Current on-hand stock quantities, valuation, and reorder levels',
    descriptionAr: 'كميات المخزون الحالية، تقييم المخزون وحدود إعادة الطلب',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
    fields: [
      { id: 'sku', nameEn: 'SKU / Code', nameAr: 'رمز الصنف', type: 'string', sortable: true, filterable: true },
      { id: 'name', nameEn: 'Product Name', nameAr: 'اسم المنتج', type: 'string', sortable: true, filterable: true },
      { id: 'categoryName', nameEn: 'Category', nameAr: 'التصنيف', type: 'string', sortable: true, filterable: true },
      { id: 'brandName', nameEn: 'Brand', nameAr: 'العلامة التجارية', type: 'string', sortable: true, filterable: true },
      { id: 'stockQuantity', nameEn: 'Quantity on Hand', nameAr: 'الكمية المتوفرة', type: 'number', sortable: true, filterable: true, aggregable: true },
      { id: 'costPrice', nameEn: 'Unit Cost', nameAr: 'تكلفة الوحدة', type: 'currency', sortable: true, filterable: true },
      { id: 'sellingPrice', nameEn: 'Selling Price', nameAr: 'سعر البيع', type: 'currency', sortable: true, filterable: true },
      { id: 'totalValuation', nameEn: 'Total Valuation', nameAr: 'القيمة الإجمالية للمخزون', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'minStockLevel', nameEn: 'Reorder Level', nameAr: 'حد إعادة الطلب', type: 'number', sortable: true, filterable: true },
    ],
  },
  customers: {
    id: 'customers',
    nameEn: 'Customers & Receivables',
    nameAr: 'العملاء والمديونيات',
    category: 'CUSTOMERS',
    descriptionEn: 'Customer directory, balances, credit limits, and aging receivables',
    descriptionAr: 'دليل العملاء، الأرصدة، الحدود الائتمانية وأعمار الديون',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
    fields: [
      { id: 'code', nameEn: 'Customer Code', nameAr: 'كود العميل', type: 'string', sortable: true, filterable: true },
      { id: 'name', nameEn: 'Customer Name', nameAr: 'اسم العميل', type: 'string', sortable: true, filterable: true },
      { id: 'phone', nameEn: 'Phone Number', nameAr: 'الهاتف', type: 'string', sortable: false, filterable: true },
      { id: 'creditLimit', nameEn: 'Credit Limit', nameAr: 'الحد الائتماني', type: 'currency', sortable: true, filterable: true },
      { id: 'totalSales', nameEn: 'Total Invoiced', nameAr: 'إجمالي الفواتير', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'totalPaid', nameEn: 'Total Paid', nameAr: 'إجمالي السداد', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'currentBalance', nameEn: 'Outstanding Balance', nameAr: 'الرصيد المتبقي', type: 'currency', sortable: true, filterable: true, aggregable: true },
    ],
  },
  suppliers: {
    id: 'suppliers',
    nameEn: 'Suppliers & Payables',
    nameAr: 'الموردين والمستحقات',
    category: 'SUPPLIERS',
    descriptionEn: 'Supplier directory, purchases balance, and outstanding payables',
    descriptionAr: 'دليل الموردين، مشترياتهم والأرصدة المستحقة',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
    fields: [
      { id: 'code', nameEn: 'Supplier Code', nameAr: 'كود المورد', type: 'string', sortable: true, filterable: true },
      { id: 'name', nameEn: 'Supplier Name', nameAr: 'اسم المورد', type: 'string', sortable: true, filterable: true },
      { id: 'phone', nameEn: 'Phone Number', nameAr: 'الهاتف', type: 'string', sortable: false, filterable: true },
      { id: 'totalPurchases', nameEn: 'Total Purchases', nameAr: 'إجمالي المشتريات', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'totalPaid', nameEn: 'Total Paid', nameAr: 'إجمالي المسدد', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'currentBalance', nameEn: 'Outstanding Payables', nameAr: 'الرصيد المستحق', type: 'currency', sortable: true, filterable: true, aggregable: true },
    ],
  },
  expenses: {
    id: 'expenses',
    nameEn: 'Expenses',
    nameAr: 'المصروفات',
    category: 'FINANCE',
    descriptionEn: 'Operational expenditures, categories, payment accounts, and notes',
    descriptionAr: 'المصروفات التشغيلية، البنود، الحسابات والبيان',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
    fields: [
      { id: 'number', nameEn: 'Expense Number', nameAr: 'رقم المصروف', type: 'string', sortable: true, filterable: true },
      { id: 'expenseDate', nameEn: 'Date', nameAr: 'التاريخ', type: 'date', sortable: true, filterable: true },
      { id: 'categoryName', nameEn: 'Expense Category', nameAr: 'بند المصروف', type: 'string', sortable: true, filterable: true },
      { id: 'accountName', nameEn: 'Paid From Account', nameAr: 'صُرف من حساب', type: 'string', sortable: true, filterable: true },
      { id: 'amount', nameEn: 'Amount', nameAr: 'المبلغ', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'description', nameEn: 'Description', nameAr: 'البيان', type: 'string', sortable: false, filterable: true },
    ],
  },
  quotations: {
    id: 'quotations',
    nameEn: 'Quotations',
    nameAr: 'عروض الأسعار',
    category: 'SALES',
    descriptionEn: 'Price quotations, conversion tracking, and validity periods',
    descriptionAr: 'عروض الأسعار، متابعة التحويل وصلاحية العرض',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
    fields: [
      { id: 'number', nameEn: 'Quotation Number', nameAr: 'رقم العرض', type: 'string', sortable: true, filterable: true },
      { id: 'quotationDate', nameEn: 'Date', nameAr: 'التاريخ', type: 'date', sortable: true, filterable: true },
      { id: 'customerName', nameEn: 'Customer Name', nameAr: 'اسم العميل', type: 'string', sortable: true, filterable: true },
      { id: 'grandTotal', nameEn: 'Total Amount', nameAr: 'إجمالي العرض', type: 'currency', sortable: true, filterable: true, aggregable: true },
      { id: 'creditLimit', nameEn: 'Quotation Credit Limit', nameAr: 'الحد الائتماني للعرض', type: 'currency', sortable: true, filterable: true },
      { id: 'creditLimitDays', nameEn: 'Credit Days', nameAr: 'مدة الائتمان (أيام)', type: 'number', sortable: true, filterable: true },
      { id: 'status', nameEn: 'Status', nameAr: 'الحالة', type: 'badge', sortable: true, filterable: true },
    ],
  },
  delivery_orders: {
    id: 'delivery_orders',
    nameEn: 'Delivery Orders',
    nameAr: 'أوامر التوصيل',
    category: 'OPERATIONS',
    descriptionEn: 'Goods delivery dispatches, pending fulfillments, and customers',
    descriptionAr: 'أوامر تسليم البضائع وحالات التسليم والتوصيل',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'],
    fields: [
      { id: 'number', nameEn: 'DO Number', nameAr: 'رقم إذن التسليم', type: 'string', sortable: true, filterable: true },
      { id: 'deliveryDate', nameEn: 'Delivery Date', nameAr: 'تاريخ التسليم', type: 'date', sortable: true, filterable: true },
      { id: 'customerName', nameEn: 'Customer Name', nameAr: 'اسم العميل', type: 'string', sortable: true, filterable: true },
      { id: 'status', nameEn: 'Status', nameAr: 'الحالة', type: 'badge', sortable: true, filterable: true },
      { id: 'itemCount', nameEn: 'Total Items', nameAr: 'عدد الأصناف', type: 'number', sortable: true, filterable: true, aggregable: true },
    ],
  },
};

export const STANDARD_REPORTS_METADATA = [
  // ── 1. Sales Reports
  {
    id: 'sales_summary',
    family: 'sales',
    nameEn: 'Sales Summary',
    nameAr: 'ملخص المبيعات',
    descEn: 'Overall sales metrics, invoice count, gross, discounts, net sales, paid and outstanding amounts',
    descAr: 'المؤشرات العامة للمبيعات وعدد الفواتير والإجمالي والخصومات والصافي والمدفوع والمتبقي',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
  },
  {
    id: 'sales_by_customer',
    family: 'sales',
    nameEn: 'Sales by Customer',
    nameAr: 'المبيعات حسب العميل',
    descEn: 'Total sales, revenue, paid amount, and outstanding balance broken down by customer',
    descAr: 'إجمالي المبيعات والإيرادات والمدفوع والمتبقي مفصلة حسب كل عميل',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
  },
  {
    id: 'sales_by_product',
    family: 'sales',
    nameEn: 'Sales by Product',
    nameAr: 'المبيعات حسب المنتج',
    descEn: 'Product sales volume, gross revenue, average selling price, cost, and gross profit',
    descAr: 'حجم مبيعات المنتجات والإيراد الإجمالي ومتوسط سعر البيع والتكلفة والربح',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'sales_by_category',
    family: 'sales',
    nameEn: 'Sales by Category / Brand',
    nameAr: 'المبيعات حسب التصنيف / الماركة',
    descEn: 'Revenue, quantity sold, and profitability categorized by product categories and brands',
    descAr: 'الإيرادات والكميات المباعة ومعدلات الربحية مصنفة حسب التصنيفات والعلامات التجارية',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'sales_by_payment_method',
    family: 'sales',
    nameEn: 'Sales by Payment Method',
    nameAr: 'المبيعات حسب طريقة الدفع',
    descEn: 'Breakdown of cash, K-Net, credit card, and bank transfer collections',
    descAr: 'تفصيل المقبوضات حسب نقداً، كي نت، بطاقات الائتمان والتحويل البنكي',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'receivables_aging',
    family: 'sales',
    nameEn: 'Accounts Receivable Aging',
    nameAr: 'أعمار ديون العملاء (المدينون)',
    descEn: 'Aging analysis of unpaid customer invoices (0–7, 8–30, 31–60, 61–90, 90+ days)',
    descAr: 'تحليل أعمار فواتير العملاء غير المسددة وفترات استحقاقها',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
  },

  // ── 2. Purchases Reports
  {
    id: 'purchases_summary',
    family: 'purchases',
    nameEn: 'Purchases Summary',
    nameAr: 'ملخص المشتريات',
    descEn: 'Overall purchase expenditures, supplier bill totals, paid and outstanding payables',
    descAr: 'المصروفات الشرائية العامة وإجمالي فواتير الموردين والمسدد والمستحق',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'purchases_by_supplier',
    family: 'purchases',
    nameEn: 'Purchases by Supplier',
    nameAr: 'المشتريات حسب المورد',
    descEn: 'Purchase volume, paid amounts, and current payable balances by vendor',
    descAr: 'حجم المشتريات والمدفوعات والأرصدة المستحقة لكل مورد',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'payables_aging',
    family: 'purchases',
    nameEn: 'Accounts Payable Aging',
    nameAr: 'أعمار مستحقات الموردين (الدائنون)',
    descEn: 'Aging breakdown of outstanding vendor invoices and dues',
    descAr: 'تحليل أعمار ديون وفواتير الموردين المستحقة السداد',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },

  // ── 3. Inventory Reports
  {
    id: 'inventory_valuation',
    family: 'inventory',
    nameEn: 'Stock Valuation Report',
    nameAr: 'تقرير تقييم المخزون',
    descEn: 'On-hand quantities, cost price, retail price, and total asset value per SKU',
    descAr: 'الكميات المتوفرة وسعر التكلفة وسعر البيع وإجمالي قيمة الأصول المخزنية',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  {
    id: 'low_stock_reorder',
    family: 'inventory',
    nameEn: 'Low Stock & Reorder Report',
    nameAr: 'الأصناف منخفضة المخزون وإعادة الطلب',
    descEn: 'Products at or below their minimum reorder thresholds requiring procurement',
    descAr: 'المنتجات التي وصلت إلى حد إعادة الطلب أو أقل وتتطلب الشراء',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  {
    id: 'dead_stock',
    family: 'inventory',
    nameEn: 'Dead Stock & Slow Movers',
    nameAr: 'المخزون الراكد وبطيء الحركة',
    descEn: 'Products with no sales movement over the last 90+ days',
    descAr: 'المنتجات التي لم تسجل أي حركة مبيعات خلال أكثر من 90 يوماً',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
  },

  // ── 4. Customer & Supplier Statements
  {
    id: 'customer_statement',
    family: 'customers',
    nameEn: 'Customer Account Statement',
    nameAr: 'كشف حساب عميل',
    descEn: 'Itemized debit, credit, invoice, and payment history with running balance for a customer',
    descAr: 'كشف حساب تفصيلي بحركات الفواتير والمدفوعات والرصيد التراكمي للعميل',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
  },
  {
    id: 'supplier_statement',
    family: 'suppliers',
    nameEn: 'Supplier Account Statement',
    nameAr: 'كشف حساب مورد',
    descEn: 'Itemized purchase bills, payments, and running balance for a supplier',
    descAr: 'كشف حساب تفصيلي بمشتريات وسداد فواتير المورد والرصيد التراكمي',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },

  // ── 5. Financial Reports
  {
    id: 'income_statement',
    family: 'finance',
    nameEn: 'Income Statement (P&L)',
    nameAr: 'قائمة الدخل والأرباح والخسائر',
    descEn: 'Revenues, cost of goods sold, gross profit, operating expenses, and net profit',
    descAr: 'الإيرادات، تكلفة البضاعة المباعة، مجمل الربح، المصروفات التشغيلية وصافي الدخل',
    requiredRoles: ['OWNER', 'ADMIN'],
  },
  {
    id: 'cash_flow',
    family: 'finance',
    nameEn: 'Cash Flow & Accounts Statement',
    nameAr: 'حركة السيولة والتدفق النقدي',
    descEn: 'Total inflows, outflows, and net liquidity movement across cash and bank accounts',
    descAr: 'إجمالي المقبوضات والمدفوعات وصافي التدفق النقدي عبر الصناديق والبنوك',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'account_balances',
    family: 'finance',
    nameEn: 'Financial Account Balances',
    nameAr: 'أرصدة الحسابات المالية',
    descEn: 'Current standing and summary of all cash drawers, bank accounts, and ledgers',
    descAr: 'الأرصدة الحالية لجميع حسابات الصناديق والبنوك والعهد',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'expense_breakdown',
    family: 'finance',
    nameEn: 'Expense Analysis by Category',
    nameAr: 'تحليل المصروفات حسب البند',
    descEn: 'Detailed distribution of expenses by category, vendor, and payment source',
    descAr: 'توزيع المصروفات التشغيلية حسب التصنيف وحساب الدفع',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER'],
  },
  {
    id: 'payroll_summary',
    family: 'salary',
    nameEn: 'Payroll & Salary Summary',
    nameAr: 'ملخص الرواتب والأجور',
    descEn: 'Total salaries paid, advance payments, deductions, and employee disbursements',
    descAr: 'إجمالي الرواتب المصروفة، السلفيات والخصومات ومستحقات الموظفين',
    requiredRoles: ['OWNER', 'ADMIN'],
  },

  // ── 6. Operational Reports
  {
    id: 'delivery_fulfillment',
    family: 'delivery_orders',
    nameEn: 'Delivery Fulfillment Report',
    nameAr: 'تقرير تنفيذ أوامر التوصيل',
    descEn: 'Status of deliveries, dispatched orders, and pending dispatches',
    descAr: 'حالة تسليم الطلبات، الأوامر المنفذة والأوامر المعلقة قيد التوصيل',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'WAREHOUSE'],
  },
  {
    id: 'quotation_conversion',
    family: 'quotations',
    nameEn: 'Quotation Conversion Report',
    nameAr: 'تقرير تحويل عروض الأسعار',
    descEn: 'Quotations generated, accepted rates, conversion to sales invoices, and expired offers',
    descAr: 'عروض الأسعار المصدرة، نسب القبول والتحويل إلى فواتير مبيعات والعروض المنتهية',
    requiredRoles: ['OWNER', 'ADMIN', 'MANAGER', 'SALES'],
  },
  {
    id: 'executive_performance',
    family: 'executive',
    nameEn: "Executive Business Performance",
    nameAr: 'تقرير الأداء التنفيذي للمؤسسة',
    descEn: "Comprehensive master dashboard for business owners: Sales, Net Margin, Liquidity & Working Capital",
    descAr: 'التقرير التنفيذي الشامل لمالك المؤسسة: المبيعات، هوامش الربح، السيولة ورأس المال العامل',
    requiredRoles: ['OWNER', 'ADMIN'],
  },
];
