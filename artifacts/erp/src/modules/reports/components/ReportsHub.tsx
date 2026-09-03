import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  ShoppingCart,
  Boxes,
  Users,
  Building2,
  Wallet,
  Truck,
  FileText,
  ShieldCheck,
  Search,
  Plus,
  ArrowRight,
  Bookmark,
  Share2,
  Trash2,
  Sparkles,
  Sliders,
  DollarSign
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ReportMeta, SavedReport } from '../types';
import { ReportViewer } from './ReportViewer';
import { CustomReportBuilder } from './CustomReportBuilder';

export const ReportsHub: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderInitialConfig, setBuilderInitialConfig] = useState<any>(null);

  // 1. Fetch Executive Overview KPIs
  const { data: hubOverviewData } = useQuery<{
    success: boolean;
    data: {
      salesTotal: number;
      profitTotal: number;
      receivablesTotal: number;
      payablesTotal: number;
      inventoryValuation: number;
      cashBankLiquidity: number;
    };
  }>({
    queryKey: ['reports-hub-overview'],
    queryFn: () => api.get('/api/reports/hub'),
  });

  const overview = hubOverviewData?.data;

  // 2. Fetch Available Standard Reports Catalog
  const { data: catalogData } = useQuery<{
    success: boolean;
    data: { reports: ReportMeta[] };
  }>({
    queryKey: ['reports-catalog'],
    queryFn: () => api.get('/api/reports/catalog'),
  });

  const reports = catalogData?.data?.reports || [];

  // 3. Fetch Saved Custom Reports
  const { data: savedReportsData } = useQuery<{
    success: boolean;
    data: SavedReport[];
  }>({
    queryKey: ['saved-reports'],
    queryFn: () => api.get('/api/reports/saved'),
  });

  const savedReports = savedReportsData?.data || [];

  // Delete saved report mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/reports/saved/${id}`),
    onSuccess: () => {
      toast({ title: 'Deleted', description: 'Saved report removed.' });
      queryClient.invalidateQueries({ queryKey: ['saved-reports'] });
    },
  });

  // Filter reports based on active tab and search query
  const filteredReports = reports.filter((r) => {
    // Tab filter
    if (activeTab === 'SALES' && r.family !== 'sales' && r.family !== 'quotations') return false;
    if (activeTab === 'PURCHASES' && r.family !== 'purchases') return false;
    if (activeTab === 'INVENTORY' && r.family !== 'inventory') return false;
    if (activeTab === 'CUSTOMERS_SUPPLIERS' && r.family !== 'customers' && r.family !== 'suppliers') return false;
    if (activeTab === 'FINANCE' && r.family !== 'finance' && r.family !== 'salary' && r.family !== 'executive') return false;
    if (activeTab === 'OPERATIONS' && r.family !== 'delivery_orders') return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchEn = r.nameEn.toLowerCase().includes(q) || r.descEn.toLowerCase().includes(q);
      const matchAr = (r.nameAr || '').toLowerCase().includes(q) || (r.descAr || '').toLowerCase().includes(q);
      return matchEn || matchAr;
    }

    return true;
  });

  // Helper for report icons
  const getReportIcon = (family: string) => {
    switch (family) {
      case 'sales':
        return TrendingUp;
      case 'purchases':
        return ShoppingCart;
      case 'inventory':
        return Boxes;
      case 'customers':
      case 'suppliers':
        return Users;
      case 'finance':
      case 'salary':
      case 'executive':
        return Wallet;
      case 'delivery_orders':
        return Truck;
      case 'quotations':
        return FileText;
      default:
        return BarChart3;
    }
  };

  // If a report is selected, open ReportViewer
  if (selectedReportId) {
    return <ReportViewer reportId={selectedReportId} onBack={() => setSelectedReportId(null)} />;
  }

  // If custom report builder is opened, render it
  if (showBuilder) {
    return (
      <CustomReportBuilder
        initialConfig={builderInitialConfig}
        onBack={() => {
          setShowBuilder(false);
          setBuilderInitialConfig(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-primary" />
            Enterprise Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time financial audits, operational statements, and interactive business intelligence.
          </p>
        </div>

        <Button
          onClick={() => {
            setBuilderInitialConfig(null);
            setShowBuilder(true);
          }}
          className="flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Custom Report
        </Button>
      </div>

      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="shadow-2xs border-l-4 border-l-blue-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Gross Sales</p>
            <h3 className="text-base font-bold text-foreground mt-1">
              {(overview?.salesTotal ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-l-4 border-l-emerald-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Gross Profit</p>
            <h3 className="text-base font-bold text-emerald-600 mt-1">
              {(overview?.profitTotal ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-l-4 border-l-amber-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Receivables Due</p>
            <h3 className="text-base font-bold text-amber-600 mt-1">
              {(overview?.receivablesTotal ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-l-4 border-l-red-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Payables Due</p>
            <h3 className="text-base font-bold text-red-600 mt-1">
              {(overview?.payablesTotal ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-l-4 border-l-purple-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Stock Assets</p>
            <h3 className="text-base font-bold text-purple-600 mt-1">
              {(overview?.inventoryValuation ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border-l-4 border-l-indigo-500">
          <CardContent className="p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Cash & Bank</p>
            <h3 className="text-base font-bold text-indigo-600 mt-1">
              {(overview?.cashBankLiquidity ?? 0).toFixed(3)} <span className="text-[10px] font-normal text-muted-foreground">KWD</span>
            </h3>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="h-9 flex flex-wrap">
            <TabsTrigger value="ALL" className="text-xs">All Reports ({reports.length})</TabsTrigger>
            <TabsTrigger value="SALES" className="text-xs">Sales</TabsTrigger>
            <TabsTrigger value="PURCHASES" className="text-xs">Purchases</TabsTrigger>
            <TabsTrigger value="INVENTORY" className="text-xs">Inventory</TabsTrigger>
            <TabsTrigger value="CUSTOMERS_SUPPLIERS" className="text-xs">Customers & Suppliers</TabsTrigger>
            <TabsTrigger value="FINANCE" className="text-xs">Financials</TabsTrigger>
            <TabsTrigger value="OPERATIONS" className="text-xs">Operations</TabsTrigger>
            <TabsTrigger value="SAVED" className="text-xs flex items-center gap-1">
              <Bookmark className="w-3 h-3" />
              Saved ({savedReports.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-72">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report titles or keywords..."
            className="ps-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Reports Content View */}
      {activeTab === 'SAVED' ? (
        /* Saved Custom Reports Tab */
        <div className="space-y-4">
          {savedReports.length === 0 ? (
            <Card className="border-dashed p-12 text-center text-muted-foreground">
              <Bookmark className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <h3 className="font-semibold text-sm text-foreground">No Saved Custom Reports Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Create a custom report with your preferred fields, aggregations, and filters, then save it to rerun it with one click.
              </p>
              <Button
                size="sm"
                onClick={() => setShowBuilder(true)}
                className="mt-4 text-xs"
              >
                Launch Report Builder
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedReports.map((sr) => (
                <Card key={sr.id} className="shadow-2xs hover:shadow-md transition-shadow border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold">{sr.name}</CardTitle>
                      {sr.isShared && (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 flex items-center gap-1">
                          <Share2 className="w-2.5 h-2.5" /> Shared
                        </Badge>
                      )}
                    </div>
                    {sr.description && (
                      <CardDescription className="text-xs mt-1 line-clamp-2">{sr.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t pt-2 mt-2">
                      <span>Source: <strong className="text-foreground uppercase">{sr.dataSource}</strong></span>
                      <span>By: {sr.createdByName || 'Staff'}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(sr.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Delete saved report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setBuilderInitialConfig(sr.config);
                          setShowBuilder(true);
                        }}
                        className="text-xs h-8 flex items-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        Run & Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Standard Catalog Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => {
            const Icon = getReportIcon(report.family);
            return (
              <Card
                key={report.id}
                onClick={() => setSelectedReportId(report.id)}
                className="shadow-2xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-normal uppercase tracking-wider">
                      {report.family.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {report.nameEn}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-medium">{report.nameAr}</p>
                  <CardDescription className="text-xs mt-1.5 line-clamp-2">
                    {report.descEn}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="flex items-center justify-between text-xs font-medium text-primary pt-2 border-t mt-3">
                    <span>View Report</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
