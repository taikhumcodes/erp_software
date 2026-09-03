import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Database, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  FileJson, 
  ShieldCheck, 
  Loader2,
  Lock
} from 'lucide-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const BackupRestorePage: React.FC = () => {
  const { data: user } = useGetCurrentUser();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<any | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Security check: ONLY admin@albunyan.com can view or use this page
  const isSuperAdmin = user?.email === 'admin@albunyan.com';

  // Fetch current database statistics
  const { data: statsData, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['backup-stats'],
    queryFn: () => api.get<any>('/api/backup/stats'),
    enabled: isSuperAdmin,
  });

  const stats = statsData?.data;

  // Mutation to handle database restore
  const restoreMutation = useMutation({
    mutationFn: (payload: any) => api.post<any>('/api/backup/import', payload),
    onSuccess: (res) => {
      toast({
        title: 'System Restored Successfully',
        description: `Restored ${res.data?.restoredRecords ?? ''} records across all database tables.`,
      });
      setSelectedFile(null);
      setFileContent(null);
      setConfirmText('');
      refetchStats();
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: 'Restore Failed',
        description: err.message || 'An error occurred during system restore.',
      });
    },
  });

  // Handle Export / Download
  const handleExportBackup = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('erp_access_token');
      const response = await fetch('/api/backup/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate system backup.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `al-bunyan-full-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Backup Downloaded',
        description: 'Complete system snapshot has been saved to your downloads.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message || 'Could not download system backup.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.tables || typeof json.tables !== 'object') {
          throw new Error('File does not contain valid Al-Bunyan backup tables.');
        }
        setFileContent(json);
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Invalid Backup File',
          description: err.message || 'The selected file is not a valid JSON backup.',
        });
        setSelectedFile(null);
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleRestoreSubmit = () => {
    if (!fileContent) return;
    restoreMutation.mutate(fileContent);
  };

  if (!isSuperAdmin) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="text-center py-12">
          <Lock className="w-12 h-12 text-destructive mx-auto mb-4" />
          <CardTitle className="text-xl">Access Restricted</CardTitle>
          <CardDescription>
            This section is reserved exclusively for the system administrator.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">Full System Backup & Restore</h2>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
              <ShieldCheck className="w-3 h-3" /> admin@albunyan.com only
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Complete database snapshot export and atomic transactional import for disaster recovery.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchStats()} disabled={isStatsLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isStatsLoading ? 'animate-spin' : ''}`} /> Refresh Stats
        </Button>
      </div>

      {/* Database Overview Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" /> Current System Data
          </CardTitle>
          <CardDescription>Total active records across key modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-xl font-bold mt-1">{stats?.products ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Customers</p>
              <p className="text-xl font-bold mt-1">{stats?.customers ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Sales Invoices</p>
              <p className="text-xl font-bold mt-1">{stats?.sales ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Quotations</p>
              <p className="text-xl font-bold mt-1">{stats?.quotations ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Delivery Orders</p>
              <p className="text-xl font-bold mt-1">{stats?.deliveryOrders ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Purchases</p>
              <p className="text-xl font-bold mt-1">{stats?.purchases ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Payments</p>
              <p className="text-xl font-bold mt-1">{stats?.payments ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="text-xl font-bold mt-1">{stats?.expenses ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Ledger Entries</p>
              <p className="text-xl font-bold mt-1">{stats?.ledgerEntries ?? '—'}</p>
            </div>
            <div className="bg-muted/40 p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground">Suppliers</p>
              <p className="text-xl font-bold mt-1">{stats?.suppliers ?? '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Backup / Export */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Create System Backup</CardTitle>
                <CardDescription>Export entire system data to a JSON file</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              This will generate an archive containing all 34 database tables including:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>System configurations, company profile, and numbering rules</li>
              <li>Complete product inventory, categories, units, and brands</li>
              <li>Customer, supplier, quotation, sales, and delivery records</li>
              <li>All payments, finance accounts, ledger entries, and audit logs</li>
            </ul>
          </CardContent>
          <CardFooter className="pt-4 border-t">
            <Button 
              className="w-full gap-2" 
              onClick={handleExportBackup} 
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? 'Generating Backup...' : 'Download Full System Backup (.json)'}
            </Button>
          </CardFooter>
        </Card>

        {/* Section 2: Restore / Import */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Restore System Backup</CardTitle>
                <CardDescription>Import and restore database from a backup file</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">Caution: Destructive Operation</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                Restoring will overwrite current database records with the snapshot in the backup file. Always take a fresh backup first!
              </AlertDescription>
            </Alert>

            {/* File Input */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Backup File (.json)</Label>
              <Input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                disabled={restoreMutation.isPending}
                className="cursor-pointer"
              />
            </div>

            {/* File Preview */}
            {fileContent && (
              <div className="p-3 bg-muted/30 border rounded-lg space-y-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <FileJson className="w-4 h-4 text-primary" />
                  <span>{selectedFile?.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1 border-t">
                  <div>Exported: {new Date(fileContent.exportedAt).toLocaleDateString()}</div>
                  <div>By: {fileContent.exportedBy || 'admin'}</div>
                  <div>Total Records: {fileContent.metadata?.totalRecords ?? '—'}</div>
                  <div>Tables: {Object.keys(fileContent.tables || {}).length}</div>
                </div>

                {/* Confirmation Input */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground block mb-1">
                    Type <span className="font-mono font-bold text-destructive">RESTORE</span> to confirm:
                  </Label>
                  <Input
                    placeholder="RESTORE"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full gap-2"
              disabled={!fileContent || confirmText !== 'RESTORE' || restoreMutation.isPending}
              onClick={handleRestoreSubmit}
            >
              {restoreMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {restoreMutation.isPending ? 'Restoring Database...' : 'Restore System Database'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
