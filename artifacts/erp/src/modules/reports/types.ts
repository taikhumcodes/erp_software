export type ReportCategory =
  | 'ALL'
  | 'SALES'
  | 'PURCHASES'
  | 'INVENTORY'
  | 'CUSTOMERS_SUPPLIERS'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'CUSTOM';

export interface ReportMeta {
  id: string;
  family: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  requiredRoles: string[];
}

export interface DataSourceMeta {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  descriptionEn: string;
  descriptionAr: string;
  fields: {
    id: string;
    nameEn: string;
    nameAr: string;
    type: 'string' | 'number' | 'currency' | 'date' | 'boolean' | 'badge';
    aggregable?: boolean;
  }[];
}

export interface ReportColumn {
  id: string;
  label: string;
  labelAr?: string;
  type?: string;
}

export interface ReportKPI {
  label: string;
  labelAr?: string;
  value: string | number;
  change?: string;
}

export interface ReportResult {
  metadata: {
    id: string;
    nameEn: string;
    nameAr: string;
    generatedAt: string;
    period: { start?: string; end?: string };
  };
  columns: ReportColumn[];
  rows: Record<string, any>[];
  totals: Record<string, any>;
  kpis?: ReportKPI[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  category: string;
  dataSource: string;
  config: any;
  isShared: boolean;
  createdById: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}
