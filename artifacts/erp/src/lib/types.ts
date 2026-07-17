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
