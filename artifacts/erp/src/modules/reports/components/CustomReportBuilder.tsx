import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  Play,
  Save,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Database,
  Sliders,
  Filter,
  Eye,
  Lock,
  Share2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { DataSourceMeta } from '../types';

interface CustomReportBuilderProps {
  onBack: () => void;
  initialConfig?: any;
}

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: any;
}

export const CustomReportBuilder: React.FC<CustomReportBuilderProps> = ({ onBack, initialConfig }) => {
  const { toast } = useToast();

  const [dataSource, setDataSource] = useState<string>(initialConfig?.dataSource || 'sales');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialConfig?.columns || []);
  const [filters, setFilters] = useState<FilterCondition[]>(initialConfig?.filters || []);
  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [reportName, setReportName] = useState(initialConfig?.name || '');
  const [reportDescription, setReportDescription] = useState(initialConfig?.description || '');
  const [isShared, setIsShared] = useState(initialConfig?.isShared ?? false);

  // Fetch catalog of available data sources
  const { data: catalogData } = useQuery<{
    success: boolean;
    data: { dataSources: DataSourceMeta[] };
  }>({
    queryKey: ['reports-catalog'],
    queryFn: () => api.get('/api/reports/catalog'),
  });

  const dataSources = catalogData?.data?.dataSources || [];
  const currentSource = dataSources.find((ds) => ds.id === dataSource);

  // When data source changes, default to selecting its first 5 fields
  const handleDataSourceChange = (sourceId: string) => {
    setDataSource(sourceId);
    const ds = dataSources.find((s) => s.id === sourceId);
    if (ds) {
      setSelectedColumns(ds.fields.slice(0, 5).map((f) => f.id));
      setFilters([]);
    }
  };

  // Toggle field selection
  const toggleColumn = (fieldId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
    );
  };

  const selectAllColumns = () => {
    if (currentSource) {
      setSelectedColumns(currentSource.fields.map((f) => f.id));
    }
  };

  const clearAllColumns = () => {
    setSelectedColumns([]);
  };

  // Filter conditions management
  const addFilter = () => {
    if (!currentSource || currentSource.fields.length === 0) return;
    setFilters((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 9),
        field: currentSource.fields[0].id,
        operator: 'equals',
        value: '',
      },
    ]);
  };

  const removeFilter = (id: string) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  // Live Query Execution Mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      api.post<any>('/api/reports/custom/run', {
        dataSource,
        columns: selectedColumns,
        filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
        page: 1,
        limit: 50,
      }),
  });

  const handleRunPreview = () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'No Columns Selected',
        description: 'Please select at least one column to include in your report.',
        variant: 'destructive',
      });
      return;
    }
    setActiveTab('preview');
    previewMutation.mutate();
  };

  // Save Report Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: any) => api.post('/api/reports/saved', payload),
    onSuccess: () => {
      toast({
        title: 'Report Saved Successfully',
        description: `Custom report "${reportName}" has been saved.`,
      });
      setIsSaveModalOpen(false);
      onBack();
    },
    onError: (err: any) => {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save custom report.',
        variant: 'destructive',
      });
    },
  });

  const handleSaveReport = () => {
    if (!reportName.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a name for this custom report.',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate({
      name: reportName.trim(),
      description: reportDescription.trim() || undefined,
      category: currentSource?.category || 'CUSTOM',
      dataSource,
      config: {
        dataSource,
        columns: selectedColumns,
        filters: filters.map(({ field, operator, value }) => ({ field, operator, value })),
      },
      isShared,
    });
  };

  const previewResult = previewMutation.data?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sliders className="w-6 h-6 text-primary" />
              Custom Report Builder
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build tailored reports by selecting business data sources, custom fields, and nested filters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'configure' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('configure')}
            className="flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configure
          </Button>

          <Button
            variant={activeTab === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={handleRunPreview}
            disabled={selectedColumns.length === 0 || previewMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {previewMutation.isPending ? 'Running...' : 'Preview Live'}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsSaveModalOpen(true)}
            disabled={selectedColumns.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Save className="w-3.5 h-3.5" />
            Save Report
          </Button>
        </div>
      </div>

      {activeTab === 'configure' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Data Source Selector & Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Data Source */}
            <Card className="shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Step 1: Choose Business Data Source
                </CardTitle>
                <CardDescription className="text-xs">
                  Select the underlying transactional dataset you want to analyze.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {dataSources.map((ds) => (
                    <button
                      key={ds.id}
                      type="button"
                      onClick={() => handleDataSourceChange(ds.id)}
                      className={`p-3 rounded-lg border text-start transition-all ${
                        dataSource === ds.id
                          ? 'border-primary bg-primary/5 text-primary shadow-xs font-semibold'
                          : 'border-border/60 hover:border-primary/40 text-muted-foreground'
                      }`}
                    >
                      <p className="text-xs font-medium text-foreground">{ds.nameEn}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{ds.nameAr}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Columns Chooser */}
            <Card className="shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      Step 2: Choose Visible Columns ({selectedColumns.length} selected)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Pick the columns to display and export in your report.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={selectAllColumns} className="text-xs h-7">
                      Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAllColumns} className="text-xs h-7 text-muted-foreground">
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {currentSource?.fields.map((f) => {
                    const isSelected = selectedColumns.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => toggleColumn(f.id)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer select-none transition-colors ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5 text-foreground'
                            : 'border-border/50 text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleColumn(f.id)} className="mt-0.5" />
                        <div className="text-xs">
                          <p className="font-medium">{f.nameEn}</p>
                          <p className="text-[10px] text-muted-foreground">{f.nameAr}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Step 3 Filters */}
          <div className="space-y-6">
            <Card className="shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    Step 3: Filter Conditions
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={addFilter} className="h-7 text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Filter
                  </Button>
                </div>
                <CardDescription className="text-xs">
                  Narrow down the dataset by specifying field conditions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filters.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg">
                    <Filter className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">No active filter criteria</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Click "Add Filter" to constrain data rows</p>
                  </div>
                ) : (
                  filters.map((filter) => (
                    <div key={filter.id} className="p-3 border rounded-lg bg-muted/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <Select
                          value={filter.field}
                          onValueChange={(val) => updateFilter(filter.id, { field: val })}
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px]">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {currentSource?.fields.map((f) => (
                              <SelectItem key={f.id} value={f.id}>{f.nameEn}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.operator}
                          onValueChange={(val) => updateFilter(filter.id, { operator: val })}
                        >
                          <SelectTrigger className="h-8 text-xs w-[110px]">
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">Equals (=)</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                            <SelectItem value="greater_than">&gt;= Greater</SelectItem>
                            <SelectItem value="less_than">&lt;= Less</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFilter(filter.id)}
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Input
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        placeholder="Condition value..."
                        className="h-8 text-xs"
                      />
                    </div>
                  ))
                )}

                <Button
                  onClick={handleRunPreview}
                  disabled={selectedColumns.length === 0 || previewMutation.isPending}
                  className="w-full mt-4 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  {previewMutation.isPending ? 'Executing Query...' : 'Run Preview Report'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* Live Preview Tab */
        <div className="space-y-4">
          <Card className="shadow-2xs overflow-hidden border">
            <CardHeader className="py-3 px-6 bg-muted/30 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Live Preview Results</CardTitle>
                <CardDescription className="text-xs">
                  {previewResult ? `${previewResult.meta.total} rows matching criteria` : 'Query executed'}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab('configure')} className="text-xs h-8">
                Edit Configuration
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    {previewResult?.columns.map((col: any) => (
                      <TableHead key={col.id} className="text-xs font-semibold whitespace-nowrap">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!previewResult || previewResult.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={previewResult?.columns.length || 4} className="py-12 text-center text-muted-foreground">
                        No rows returned for current configuration.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewResult.rows.map((row: any, idx: number) => (
                      <TableRow key={idx} className="hover:bg-muted/30">
                        {previewResult.columns.map((col: any) => {
                          const val = row[col.id];
                          const isCurrency = col.type === 'currency' && typeof val === 'number';
                          return (
                            <TableCell key={col.id} className={`text-xs ${isCurrency ? 'font-mono' : ''}`}>
                              {isCurrency ? `${val.toFixed(3)} KWD` : val ?? '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* Save Custom Report Modal */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Custom Report</DialogTitle>
            <DialogDescription className="text-xs">
              Save this report specification so you and your team can rerun it with one click anytime.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Report Name *</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Top Customer Sales Q3"
                className="mt-1.5 h-9 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Description (Optional)</Label>
              <Input
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Brief summary of report purpose..."
                className="mt-1.5 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
              <Checkbox
                id="isShared"
                checked={isShared}
                onCheckedChange={(checked) => setIsShared(Boolean(checked))}
              />
              <div>
                <label htmlFor="isShared" className="text-xs font-medium cursor-pointer flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-primary" />
                  Share with team
                </label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  When enabled, all authorized users can see and run this saved report.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
