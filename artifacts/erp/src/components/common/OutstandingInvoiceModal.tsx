import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Download,
  Printer,
  X,
  FileText,
  Calendar,
  UserCheck,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import { Customer, SaleListItem, PaginatedResponse } from '@/lib/types';
import { CompanyProfileService } from '@/modules/documents/services/CompanyProfileService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  OutstandingInvoiceTemplate,
  OutstandingInvoiceRow,
} from '@/modules/documents/templates/outstanding-invoice/OutstandingInvoiceTemplate';

interface OutstandingInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  initialCustomerId?: string;
}

export const OutstandingInvoiceModal: React.FC<OutstandingInvoiceModalProps> = ({
  open,
  onClose,
  initialCustomerId,
}) => {
  const { toast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [unpaidOnly, setUnpaidOnly] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(undefined);

  // Set initial customer when opened
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId, open]);

  // Fetch company profile for logo
  useEffect(() => {
    CompanyProfileService.getProfile().then((profile) => {
      setLogoUrl(profile.logoUrl);
    }).catch(console.error);
  }, []);

  // 1. Fetch Customers List for selector
  const { data: customersData } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers-list-all'],
    queryFn: () => api.get('/api/customers?limit=200'),
    enabled: open,
  });

  const customers = customersData?.data || [];
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // 2. Fetch Invoices for the selected customer
  const { data: salesData, isLoading: isLoadingSales } = useQuery<PaginatedResponse<SaleListItem>>({
    queryKey: ['customer-sales-outstanding', selectedCustomerId],
    queryFn: () => api.get(`/api/sales?customerId=${selectedCustomerId}&limit=100`),
    enabled: Boolean(selectedCustomerId && open),
  });

  const rawSales = salesData?.data || [];

  // If fromDate is not set, default to the earliest invoice date or 30 days ago
  useEffect(() => {
    if (rawSales.length > 0 && !fromDate) {
      const dates = rawSales.map((s) => new Date(s.saleDate).getTime());
      const minDate = new Date(Math.min(...dates));
      setFromDate(minDate.toISOString().slice(0, 10));
    } else if (!fromDate) {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFromDate(d.toISOString().slice(0, 10));
    }
  }, [rawSales, fromDate]);

  // Format date helper: YYYY-MM-DD -> DD/MM/YYYY or DD-MM-YYYY
  const formatDateDisplay = (isoOrDateStr: string, separator: '/' | '-' = '/') => {
    if (!isoOrDateStr) return '-';
    const d = new Date(isoOrDateStr);
    if (isNaN(d.getTime())) return isoOrDateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}${separator}${month}${separator}${year}`;
  };

  // Filter and compute table rows
  const { rows, totals } = useMemo(() => {
    const startMs = fromDate ? new Date(fromDate).getTime() : 0;
    const endMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : Infinity;

    const filtered = rawSales.filter((s) => {
      if (s.status === 'CANCELLED') return false;
      if (unpaidOnly && Number(s.outstandingAmount ?? 0) <= 0) return false;
      const saleTime = new Date(s.saleDate).getTime();
      return saleTime >= startMs && saleTime <= endMs;
    });

    // Sort ascending by sale date
    filtered.sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());

    let runningBalance = 0;
    let sumBill = 0;
    let sumPaid = 0;
    let sumBalance = 0;

    const now = new Date();

    const computedRows: OutstandingInvoiceRow[] = filtered.map((sale, idx) => {
      const bill = Number(sale.netAmount || 0);
      const paid = Number(sale.paidAmount || 0);
      const bal = Number(sale.outstandingAmount || 0);
      runningBalance += bal;

      sumBill += bill;
      sumPaid += paid;
      sumBalance += bal;

      const saleDateObj = new Date(sale.saleDate);
      const diffMs = now.getTime() - saleDateObj.getTime();
      const agingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      return {
        sr: idx + 1,
        date: formatDateDisplay(sale.saleDate, '-'),
        doNo: (sale as any).doNumber || '-',
        invoiceNo: sale.number,
        lpo: (sale as any).customerPONumber || '-',
        billAmount: bill,
        paid: paid,
        balance: bal,
        totalBalance: runningBalance,
        agingDays,
      };
    });

    return {
      rows: computedRows,
      totals: {
        billAmount: sumBill,
        paid: sumPaid,
        balance: sumBalance,
        totalBalance: runningBalance,
      },
    };
  }, [rawSales, fromDate, toDate, unpaidOnly]);

  // Download PDF Handler
  const handleDownloadPdf = async () => {
    const el = document.getElementById('outstanding-invoice-print-root');
    if (!el) {
      toast({ title: 'Error', description: 'Could not find template element to export', variant: 'destructive' });
      return;
    }

    try {
      setIsGeneratingPdf(true);

      // Clone element off-screen for perfect 210mm A4 canvas capture
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.width = '794px'; // 210mm at 96 DPI
      clone.style.margin = '0';
      clone.style.padding = '36px 40px';
      clone.style.backgroundColor = '#ffffff';

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-99999px';
      container.style.width = '794px';
      container.appendChild(clone);
      document.body.appendChild(container);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const safeName = (selectedCustomer?.name || 'Customer').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`Outstanding_Invoice_${safeName}_${dateStr}.pdf`);

      toast({
        title: 'PDF Downloaded',
        description: 'Customer Outstanding Invoice statement saved successfully.',
      });
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      toast({
        title: 'PDF Generation Failed',
        description: err.message || 'Could not export PDF',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Modal Top Header */}
        <DialogHeader className="p-4 px-6 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Customer Outstanding Invoice Statement
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate and download payment reminders with customer balance and aging days.
            </p>
          </div>
        </DialogHeader>

        {/* Modal Filter Toolbar */}
        <div className="p-4 px-6 bg-muted/10 border-b flex flex-wrap items-center gap-4 shrink-0">
          {/* Customer Dropdown */}
          <div className="flex-1 min-w-[240px]">
            <Label className="text-xs font-semibold text-foreground mb-1 block">Select Customer</Label>
            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Choose a customer account..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ''} {Number(c.balance || 0) > 0 ? `• Due: ${Number(c.balance).toFixed(3)} KWD` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* From Date */}
          <div className="w-36">
            <Label className="text-xs font-semibold text-foreground mb-1 block">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* To Date */}
          <div className="w-36">
            <Label className="text-xs font-semibold text-foreground mb-1 block">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Unpaid Checkbox */}
          <div className="flex items-center gap-2 mt-5 select-none cursor-pointer">
            <Checkbox
              id="unpaidOnly"
              checked={unpaidOnly}
              onCheckedChange={(c) => setUnpaidOnly(Boolean(c))}
            />
            <label htmlFor="unpaidOnly" className="text-xs font-medium cursor-pointer">
              Unpaid only (Balance &gt; 0)
            </label>
          </div>
        </div>

        {/* Modal Body: Document Visual Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-zinc-950 flex justify-center">
          {!selectedCustomerId ? (
            <div className="py-24 text-center text-muted-foreground">
              <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-foreground">Please select a customer account</p>
              <p className="text-xs text-muted-foreground mt-1">
                Choose a customer from the dropdown above to load their outstanding statement.
              </p>
            </div>
          ) : isLoadingSales ? (
            <div className="py-24 text-center text-muted-foreground flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
              <p className="text-xs font-medium">Loading customer invoice records...</p>
            </div>
          ) : (
            <div className="shadow-lg border rounded-sm overflow-hidden bg-white print:shadow-none">
              <OutstandingInvoiceTemplate
                customerName={selectedCustomer?.name || 'Customer'}
                fromDate={formatDateDisplay(fromDate, '/')}
                toDate={formatDateDisplay(toDate, '/')}
                rows={rows}
                totals={totals}
                logoUrl={logoUrl}
              />
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="p-3 px-6 border-t bg-muted/20 flex flex-row items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground font-mono">
            {rows.length} {rows.length === 1 ? 'invoice record' : 'invoice records'} • Total Balance:{' '}
            <strong className="text-foreground font-bold">{totals.totalBalance.toFixed(3)} KWD</strong>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Close
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={!selectedCustomerId || rows.length === 0}
              className="text-xs h-8 flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>

            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={!selectedCustomerId || rows.length === 0 || isGeneratingPdf}
              className="text-xs h-8 flex items-center gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
