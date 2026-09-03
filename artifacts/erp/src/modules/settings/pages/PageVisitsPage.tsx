import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Download, 
  RefreshCw, 
  Search, 
  Lock, 
  Globe, 
  Smartphone, 
  Laptop, 
  Tablet, 
  UserCheck, 
  UserX,
  ExternalLink,
  Calendar,
  MousePointerClick
} from 'lucide-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface PageVisitRecord {
  id: string;
  createdAt: string;
  source: string;
  targetUrl: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  ipAddress: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  referrer: string | null;
}

interface PageVisitResponse {
  data: PageVisitRecord[];
  stats: {
    total: number;
    today: number;
    sidebar: number;
    loginPage: number;
    uniqueIps: number;
  };
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const PageVisitsPage: React.FC = () => {
  const { data: user } = useGetCurrentUser();
  const { toast } = useToast();

  const isSuperAdmin = user?.email?.toLowerCase() === 'admin@albunyan.com';

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [source, setSource] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7D' | '30D'>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Compute start/end date ISO strings from quick filter
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString(), endDate: undefined };
    }
    if (dateFilter === '7D') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: undefined };
    }
    if (dateFilter === '30D') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: d.toISOString(), endDate: undefined };
    }
    return { startDate: undefined, endDate: undefined };
  }, [dateFilter]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (source !== 'ALL') p.set('source', source);
    if (search.trim()) p.set('search', search.trim());
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    return p.toString();
  }, [page, limit, source, search, startDate, endDate]);

  const { data, isLoading, isFetching, refetch } = useQuery<PageVisitResponse>({
    queryKey: ['page-visits', queryParams],
    queryFn: () => api.get<PageVisitResponse>(`/api/analytics/page-visits?${queryParams}`),
    enabled: isSuperAdmin,
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('erp_access_token');
      const exportParams = new URLSearchParams();
      if (source !== 'ALL') exportParams.set('source', source);
      if (search.trim()) exportParams.set('search', search.trim());
      if (startDate) exportParams.set('startDate', startDate);
      if (endDate) exportParams.set('endDate', endDate);

      const res = await fetch(`/api/analytics/page-visits/export?${exportParams.toString()}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!res.ok) throw new Error('Failed to export CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evolix_page_visits_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Downloaded',
        description: 'Page visit click logs exported to CSV successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Export Failed',
        description: err.message || 'Could not download CSV',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            This analytics section is restricted to the developer account (admin@albunyan.com).
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stats = data?.stats;
  const records = data?.data ?? [];
  const meta = data?.meta;

  const renderDeviceIcon = (device?: string | null) => {
    const d = (device || '').toLowerCase();
    if (d.includes('mobile')) return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
    if (d.includes('tablet')) return <Tablet className="w-3.5 h-3.5 text-purple-500" />;
    return <Laptop className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Page Visit & Lead Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time tracking of visitors clicking "Developed by Evolix Studio" to visit your portfolio/contact.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Clicks</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats?.total ?? 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Today's Visits</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats?.today ?? 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">From Sidebar</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats?.sidebar ?? 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
              <Laptop className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">From Login Page</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats?.loginPage ?? 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Unique IPs</p>
              <h3 className="text-2xl font-bold mt-0.5">{stats?.uniqueIps ?? 0}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search IP, User, Browser, OS..."
            className="ps-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Source Filter */}
          <Select value={source} onValueChange={(val) => { setSource(val); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Sources</SelectItem>
              <SelectItem value="SIDEBAR">Sidebar</SelectItem>
              <SelectItem value="LOGIN_PAGE">Login Page</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Select value={dateFilter} onValueChange={(val: any) => { setDateFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time</SelectItem>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="7D">Last 7 Days</SelectItem>
              <SelectItem value="30D">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Click Records Table */}
      <Card className="shadow-2xs overflow-hidden">
        <CardHeader className="py-4 px-6 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Visitor Click Stream</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Detailed audit of redirect requests to https://evolix-studio.in/contact
              </CardDescription>
            </div>
            {meta && (
              <span className="text-xs text-muted-foreground font-medium">
                {meta.total} total {meta.total === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Date & Time</TableHead>
                <TableHead className="w-[120px]">Placement</TableHead>
                <TableHead>User / Identity</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device & OS</TableHead>
                <TableHead>Browser</TableHead>
                <TableHead className="text-end">Destination</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    <MousePointerClick className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm">No page visit clicks recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Clicks from the sidebar or login page will automatically stream here in real-time.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                records.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                    {/* Timestamp */}
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {new Intl.DateTimeFormat(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      }).format(new Date(r.createdAt))}
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      {r.source === 'SIDEBAR' ? (
                        <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-xs">
                          Sidebar
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                          Login Page
                        </Badge>
                      )}
                    </TableCell>

                    {/* User */}
                    <TableCell>
                      {r.userEmail ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div className="text-xs">
                            <span className="font-medium text-foreground">{r.userName || r.userEmail}</span>
                            {r.userRole && (
                              <span className="text-[10px] text-muted-foreground ms-1">({r.userRole})</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <UserX className="w-3.5 h-3.5 opacity-60" />
                          <span>Guest Visitor</span>
                        </div>
                      )}
                    </TableCell>

                    {/* IP */}
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {r.ipAddress || '-'}
                    </TableCell>

                    {/* Device & OS */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        {renderDeviceIcon(r.device)}
                        <span>{r.os || 'Unknown'}</span>
                      </div>
                    </TableCell>

                    {/* Browser */}
                    <TableCell className="text-xs text-muted-foreground">
                      {r.browser || 'Unknown'}
                    </TableCell>

                    {/* Destination */}
                    <TableCell className="text-end">
                      <a
                        href={r.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <span>evolix-studio.in</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              Showing {(meta.page - 1) * meta.limit + 1} to{' '}
              {Math.min(meta.page * meta.limit, meta.total)} of {meta.total} clicks
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span className="text-xs font-medium px-2">
                Page {page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default PageVisitsPage;
