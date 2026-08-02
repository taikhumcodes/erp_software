// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── Product Management ───────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  nameAr: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  name: string;
  nameAr: string | null;
  abbreviation: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  category: { id: string; name: string; nameAr: string | null };
  categoryId: string;
  brand: { id: string; name: string; nameAr: string | null } | null;
  brandId: string | null;
  unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
  unitId: string;
  costPrice: string;
  sellingPrice: string;
  stockQuantity: string;
  reorderLevel: string;
  countryOfOrigin?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStatistics {
  total: number;
  active: number;
  inactive: number;
  totalBalance: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';

export interface User {
  id: string;
  email: string;
  name: string;
  nameAr: string | null;
  role: UserRole;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}

// ─── Purchases ────────────────────────────────────────────────────────────────

export type PurchaseStatus = 'DRAFT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface PurchaseItem {
  id: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    nameAr: string | null;
    unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
  };
  quantity: string;
  unitPrice: string;
  total: string;
  createdAt: string;
  updatedAt: string;
}

export interface Purchase {
  id: string;
  number: string;
  supplierId: string;
  supplier: { id: string; name: string; nameAr: string | null; code: string };
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  status: PurchaseStatus;
  purchaseDate: string;
  totalAmount: string;
  discount: string;
  netAmount: string;
  notes: string | null;
  supplierBillNo: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodType | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseListItem {
  id: string;
  number: string;
  supplierId: string;
  supplier: { id: string; name: string; nameAr: string | null; code: string };
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  status: PurchaseStatus;
  purchaseDate: string;
  totalAmount: string;
  discount: string;
  netAmount: string;
  notes: string | null;
  supplierBillNo: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodType | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseStatistics {
  total: number;
  draft: number;
  confirmed: number;
  received: number;
  cancelled: number;
  totalAmount: string;
}

// ─── Sales & Delivery ─────────────────────────────────────────────────────────

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'CONVERTED';

export interface QuotationItem {
  id: string;
  productId: string;
  product: Product;
  description: string | null;
  countryOfOrigin: string | null;
  quantity: string;
  unitPrice: string;
  amount: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  number: string;
  customerId: string | null;
  customer: Customer | null;
  customerName: string | null;
  customerNameAr: string | null;
  quotationBy: string | null;
  quotationByAr: string | null;
  quotationByAddress: string | null;
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  salespersonId: string | null;
  salesperson: { id: string; name: string; nameAr: string | null } | null;
  status: QuotationStatus;
  quotationDate: string;
  validityDate: string | null;
  referenceNumber: string | null;
  customerReference: string | null;
  totalAmount: string;
  discount: string;
  roundOff: string;
  grandTotal: string;
  notes: string | null;
  termsAndConditions: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  country: string | null;
  convertedToSaleId: string | null;
  convertedToSale: { id: string; number: string } | null;
  convertedAt: string | null;
  convertedById: string | null;
  revisionNumber: number;
  parentQuotationId: string | null;
  createdAt: string;
  updatedAt: string;
  items: QuotationItem[];
}

export interface QuotationListItem {
  id: string;
  number: string;
  customerId: string;
  customer: Pick<Customer, 'id' | 'name' | 'nameAr' | 'code'>;
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  salespersonId: string | null;
  salesperson: { id: string; name: string; nameAr: string | null } | null;
  status: QuotationStatus;
  quotationDate: string;
  validityDate: string | null;
  grandTotal: string;
  convertedToSaleId: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

export interface QuotationStatistics {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  rejected: number;
  expired: number;
  cancelled: number;
  converted: number;
  totalAmount: string;
  conversionRate: string;
}

export type SaleStatus = 'DRAFT' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';

export interface SaleItem {
  id: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    nameAr: string | null;
    unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
  };
  quantity: string;
  unitPrice: string;
  total: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  number: string;
  internalSONumber: string;
  customerPONumber: string | null;
  deliveryOrderId: string | null;
  deliveryOrder?: { number: string } | null;
  orderSource: OrderSource;
  customerId: string;
  customer: { id: string; name: string; nameAr: string | null; code: string };
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  status: SaleStatus;
  saleDate: string;
  totalAmount: string;
  discount: string;
  netAmount: string;
  notes: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodType | null;
  items: SaleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleListItem {
  id: string;
  number: string;
  internalSONumber: string;
  customerPONumber: string | null;
  deliveryOrderId: string | null;
  deliveryOrder?: { number: string } | null;
  orderSource: OrderSource;
  customerId: string;
  customer: { id: string; name: string; nameAr: string | null; code: string };
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  status: SaleStatus;
  saleDate: string;
  totalAmount: string;
  discount: string;
  netAmount: string;
  notes: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethodType | null;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleStatistics {
  total: number;
  draft: number;
  confirmed: number;
  delivered: number;
  cancelled: number;
  totalAmount: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export type PaymentType = 'CUSTOMER' | 'SUPPLIER';
export type PaymentMethodType = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'CREDIT_CARD' | 'ONLINE_TRANSFER' | 'OTHER';
export type PaymentMode = 'IMMEDIATE' | 'ADVANCE' | 'SETTLEMENT';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type AttachmentCategory = 'CHEQUE' | 'BANK_RECEIPT' | 'HANDWRITTEN_SLIP' | 'PAYMENT_PROOF' | 'OTHER';

export interface PaymentAllocation {
  id: string;
  amount: string;
  sale?: { id: string; number: string };
  purchase?: { id: string; number: string };
  allocatedAt: string;
  allocatedBy: { id: string; name: string };
}

export interface PaymentAttachment {
  id: string;
  category: AttachmentCategory;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  user: { id: string; name: string };
}

export interface PaymentListItem {
  id: string;
  number: string;
  type: PaymentType;
  method: PaymentMethodType;
  mode: PaymentMode;
  status: TransactionStatus;
  customerId: string | null;
  customer: { id: string; name: string; nameAr: string | null; code: string } | null;
  supplierId: string | null;
  supplier: { id: string; name: string; nameAr: string | null; code: string } | null;
  amount: string;
  allocatedAmount: string;
  remainingAmount: string;
  paymentDate: string;
  referenceNumber: string | null;
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface Payment extends PaymentListItem {
  notes: string | null;
  cancelledById: string | null;
  cancelledBy: { id: string; name: string; nameAr: string | null } | null;
  cancelledAt: string | null;
  allocations: PaymentAllocation[];
  attachments: PaymentAttachment[];
}

export interface PaymentStatistics {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  totalCustomerAmount: string;
  totalSupplierAmount: string;
}

// ─── Delivery Orders ──────────────────────────────────────────────────────────

export type DeliveryOrderStatus = 'DRAFT' | 'APPROVED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';
export type OrderSource = 'CUSTOMER_PO' | 'DIRECT';

export interface DeliveryOrderItem {
  id: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    nameAr: string | null;
    unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
  };
  quantity: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryOrderHistoryEntry {
  id: string;
  fromStatus: DeliveryOrderStatus | null;
  toStatus: DeliveryOrderStatus;
  userId: string;
  user: { id: string; name: string; nameAr: string | null };
  notes: string | null;
  createdAt: string;
}

export type InvoiceStatus = 'NOT_INVOICED' | 'INVOICED';

export interface DeliveryOrder {
  id: string;
  number: string;
  internalSONumber: string;
  customerPONumber: string | null;
  orderType: OrderSource;
  invoiceStatus: InvoiceStatus;
  customerId: string;
  customerNameSnapshot: string;
  customerCodeSnapshot: string;
  customer: { id: string; name: string; nameAr: string | null; code: string; address: string | null; phone: string | null };
  status: DeliveryOrderStatus;
  paymentMethod: PaymentMethodType | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  driverName: string | null;
  vehicleNumber: string | null;
  receiverName: string | null;
  contactNumber: string | null;
  notes: string | null;
  internalNotes: string | null;
  createdById: string;
  createdBy: { id: string; name: string; nameAr: string | null };
  approvedById: string | null;
  approvedBy: { id: string; name: string; nameAr: string | null } | null;
  approvedAt: string | null;
  dispatchedById: string | null;
  dispatchedBy: { id: string; name: string; nameAr: string | null } | null;
  dispatchedAt: string | null;
  deliveredById: string | null;
  deliveredBy: { id: string; name: string; nameAr: string | null } | null;
  deliveredAt: string | null;
  cancelledById: string | null;
  cancelledBy: { id: string; name: string; nameAr: string | null } | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  items: DeliveryOrderItem[];
  history: DeliveryOrderHistoryEntry[];
}

export interface DeliveryOrderListItem {
  id: string;
  number: string;
  internalSONumber: string;
  customerPONumber: string | null;
  orderType: OrderSource;
  invoiceStatus: InvoiceStatus;
  customerId: string;
  customerNameSnapshot: string;
  customerCodeSnapshot: string;
  customer: { id: string; name: string; nameAr: string | null; code: string };
  status: DeliveryOrderStatus;
  paymentMethod: PaymentMethodType | null;
  deliveryDate: string | null;
  deliveryAddress: string | null;
  createdById: string;
  createdBy: { id: string; name: string; nameAr: string | null };
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryOrderStatistics {
  total: number;
  draft: number;
  approved: number;
  dispatched: number;
  delivered: number;
  cancelled: number;
}

export interface SalesOrderForDropdown {
  id: string;
  number: string;
  customerId: string;
  customer: { id: string; name: string; nameAr: string | null; code: string; address: string | null };
  customerPONumber: string | null;
  orderSource: OrderSource;
  saleDate: string;
  user: { id: string; name: string; nameAr: string | null };
  items: {
    id: string;
    productId: string;
    product: {
      id: string;
      sku: string;
      name: string;
      nameAr: string | null;
      stockQuantity: string;
      unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
    };
    quantity: string;
    unitPrice: string;
    total: string;
  }[];
}

export interface SalesOrderDetails {
  id: string;
  number: string;
  customerId: string;
  customer: { id: string; name: string; nameAr: string | null; code: string; address: string | null; phone: string | null };
  customerPONumber: string | null;
  orderSource: OrderSource;
  saleDate: string;
  salesperson: { id: string; name: string; nameAr: string | null };
  items: {
    productId: string;
    product: {
      id: string;
      sku: string;
      name: string;
      nameAr: string | null;
      stockQuantity: string;
      unit: { id: string; name: string; nameAr: string | null; abbreviation: string };
    };
    orderedQuantity: string;
    deliveredQuantity: string;
    remainingQuantity: string;
    availableStock: string;
  }[];
}

// --- Finance Module ----------------------------------------------------------
export type FinanceAccountType = 'CASH' | 'BANK' | 'WALLET' | 'OTHER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type LedgerEntryType = 'OPENING_BALANCE' | 'SALE_PAYMENT' | 'PURCHASE_PAYMENT' | 'OWNER_INVESTMENT' | 'OWNER_WITHDRAWAL' | 'DEPOSIT' | 'WITHDRAWAL' | 'BANK_INTEREST' | 'BANK_CHARGES' | 'EXPENSE' | 'SALARY' | 'SALARY_ADVANCE' | 'BONUS' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'MISC_INCOME' | 'MISC_EXPENSE' | 'ADJUSTMENT';
export type ExpenseFrequency = 'ONCE' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type ExpenseStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type SalaryStatus = 'PENDING' | 'PAID' | 'CANCELLED';

