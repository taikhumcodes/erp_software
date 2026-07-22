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
  tax: string;
  netAmount: string;
  notes: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
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
  tax: string;
  netAmount: string;
  notes: string | null;
  paidAmount: string;
  outstandingAmount: string;
  paymentStatus: PaymentStatus;
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
