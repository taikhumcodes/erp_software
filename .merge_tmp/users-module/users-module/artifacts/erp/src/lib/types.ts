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

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** KWD serialised as fixed-3-decimal string, e.g. "1500.000" */
  balance: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierStatistics {
  total: number;
  active: number;
  inactive: number;
  /** KWD serialised as fixed-3-decimal string */
  totalBalance: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE';

export interface User {
  id: string;
  email: string;
  name: string;
  nameAr: string | null;
  role: UserRole;
  isActive: boolean;
  /** ISO-8601 string or null if never logged in */
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
