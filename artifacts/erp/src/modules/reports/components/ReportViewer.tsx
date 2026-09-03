import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  Search,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ReportResult } from '../types';
import { PrintReportTemplate } from './PrintReportTemplate';

interface ReportViewerProps {
  reportId: string;
  onBack: () => void;
}

type DatePreset = 'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS';

export const ReportViewer: React.FC<ReportViewerProps> = ({ reportId, onBack }) => {
  const { toast } = useToast();

  const [datePreset, setDatePreset] = useState<DatePreset>('THIS_MONTH');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Compute ISO date range from selected preset
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'YESTERDAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, -1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (datePreset === 'THIS_WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }
    if (datePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }
    if (datePreset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (datePreset === 'THIS_YEAR') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString(), endDate: new Date().toISOString() };
    }
    if (datePreset === 'LAST_7_DAYS') {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'LAST_30_DAYS') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (datePreset === 'LAST_90_DAYS') {
      const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return { startDate: undefined, endDate: undefined };
  }, [datePreset]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    if (search.trim()) p.set('search', search.trim());
    return p.toString();
  }, [page, limit, startDate, endDate, search]);

  const { data, isLoading, isFetching, refetch } = useQuery<{ success: boolean; data: ReportResult }>({
    queryKey: ['report-run', reportId, queryParams],
    queryFn: () => api.get(`/api/reports/run/${reportId}?${queryParams}`),
  });

  const report = data?.data;

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('erp_access_token');
      const p = new URLSearchParams();
      p.set('format', format);
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
      if (search.trim()) p.set('search', search.trim());

      const res = await fetch(`/api/reports/export/${reportId}?${p.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportId}_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xls' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Report Exported',
        description: `Downloaded report file successfully as ${format.toUpperCase()}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Could not download report',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print Template (Visible only when printing) */}
      {report && (
        <PrintReportTemplate
          report={report}
          filtersSummary={datePreset.replace(/_/g, ' ')}
        />
      )}

      {/* Screen Interface */}
      <div className="print:hidden space-y-6">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="h-9 w-9 shrink-0"
              title="Back to Reports Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {report?.metadata?.nameEn || 'Loading Report...'}
                </h1>
                {report?.metadata?.nameAr && (
                  <Badge variant="outline" className="text-xs text-muted-foreground font-normal">
                    {report.metadata.nameAr}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Report ID: <span className="font-mono">{reportId}</span> • Generated:{' '}
                {report?.metadata?.generatedAt ? new Date(report.metadata.generatedAt).toLocaleTimeString() : '-'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('excel')}
              disabled={isExporting || isLoading}
              className="flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xls)
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={isExporting || isLoading}
              className="flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <Card className="shadow-2xs bg-card/60 backdrop-blur-xs">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search across report rows..."
                className="ps-9 h-9 text-sm"
              />
            </div>

            {/* Date Preset Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date Period:
              </span>
              <Select
                value={datePreset}
                onValueChange={(val: any) => { setDatePreset(val); setPage(1); }}
              >
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="THIS_WEEK">This Week</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="YESTERDAY">Yesterday</SelectItem>
                  <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
                  <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                  <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
                  <SelectItem value="THIS_YEAR">This Year (YTD)</SelectItem>
                  <SelectItem value="ALL">All Records (No Date Limit)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic KPI Highlights Strip */}
        {report?.kpis && report.kpis.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {report.kpis.map((kpi, idx) => (
              <Card key={idx} className="shadow-2xs border-l-4 border-l-primary/70">
                <CardContent className="p-3.5">
                  <p className="text-xs font-medium text-muted-foreground truncate">{kpi.label}</p>
                  <h4 className="text-lg font-bold text-foreground mt-1 truncate">{kpi.value}</h4>
                  {kpi.labelAr && (
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">{kpi.labelAr}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Data Table */}
        <Card className="shadow-2xs overflow-hidden border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  {report?.columns.map((col) => (
                    <TableHead
                      key={col.id}
                      className={`text-xs font-semibold whitespace-nowrap ${col.type === 'currency' ? 'text-end' : ''}`}
                    >
                      <div>{col.label}</div>
                      {col.labelAr && <div className="text-[10px] text-muted-foreground font-normal">{col.labelAr}</div>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: report?.columns.length || 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !report || report.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={report?.columns.length || 6} className="py-12 text-center text-muted-foreground">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No records match the current period and filters</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try choosing a broader date preset such as "This Year" or "All Records".
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  report.rows.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="hover:bg-muted/30 transition-colors">
                      {report.columns.map((col) => {
                        const val = row[col.id];
                        const isCurrency = col.type === 'currency' && typeof val === 'number';
                        const isBadge = col.type === 'badge';

                        return (
                          <TableCell
                            key={col.id}
                            className={`text-xs ${isCurrency ? 'text-end font-mono font-medium' : ''}`}
                          >
                            {isBadge ? (
                              <Badge variant="outline" className="text-[11px] font-normal">
                                {val || '-'}
                              </Badge>
                            ) : isCurrency ? (
                              `${val.toFixed(3)} KWD`
                            ) : (
                              val ?? '-'
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>

              {/* Totals Summary Footer Row */}
              {report && report.totals && Object.keys(report.totals).length > 0 && (
                <tfoot>
                  <TableRow className="bg-muted/60 font-bold border-t-2">
                    {report.columns.map((col, idx) => {
                      if (idx === 0) {
                        return (
                          <TableCell key={col.id} className="text-xs font-bold text-foreground">
                            TOTAL / الإجمالي
                          </TableCell>
                        );
                      }
                      const totVal = report.totals[col.id];
                      const isNum = typeof totVal === 'number';
                      return (
                        <TableCell
                          key={col.id}
                          className={`text-xs font-mono font-bold ${col.type === 'currency' ? 'text-end text-foreground' : ''}`}
                        >
                          {isNum ? `${totVal.toFixed(3)} KWD` : ''}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>

          {/* Pagination Controls */}
          {report?.meta && report.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Showing {(report.meta.page - 1) * report.meta.limit + 1} to{' '}
                {Math.min(report.meta.page * report.meta.limit, report.meta.total)} of {report.meta.total} rows
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <span className="text-xs font-medium px-2">
                  Page {page} of {report.meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(report.meta.totalPages, p + 1))}
                  disabled={page >= report.meta.totalPages}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
