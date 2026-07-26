import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatKWD } from '@/lib/utils';
import { Payment, Purchase, Sale, PaginatedResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface PaymentAllocationDialogProps {
  payment: Payment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentAllocationDialog({ payment, open, onOpenChange }: PaymentAllocationDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Sales if CUSTOMER payment
  const { data: salesResponse, isLoading: isLoadingSales } = useQuery({
    queryKey: ['sales', { customerId: payment.customerId, status: 'DELIVERED', limit: 100 }],
    queryFn: () => api.get<PaginatedResponse<Sale>>(`/api/sales?customerId=${payment.customerId}&status=DELIVERED&limit=100`),
    enabled: payment.type === 'CUSTOMER' && open && !!payment.customerId,
  });

  // Fetch Purchases if SUPPLIER payment
  const { data: purchasesResponse, isLoading: isLoadingPurchases } = useQuery({
    queryKey: ['purchases', { supplierId: payment.supplierId, status: 'RECEIVED', limit: 100 }],
    queryFn: () => api.get<PaginatedResponse<Purchase>>(`/api/purchases?supplierId=${payment.supplierId}&status=RECEIVED&limit=100`),
    enabled: payment.type === 'SUPPLIER' && open && !!payment.supplierId,
  });

  const sales = (salesResponse?.data || []).filter(s => Number(s.outstandingAmount) > 0);
  const purchases = (purchasesResponse?.data || []).filter(p => Number(p.outstandingAmount) > 0);

  const options = payment.type === 'CUSTOMER' ? sales : purchases;
  const isLoading = payment.type === 'CUSTOMER' ? isLoadingSales : isLoadingPurchases;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !amount || Number(amount) <= 0) {
      toast({ title: t('error'), description: 'Invalid allocation data', variant: 'destructive' });
      return;
    }

    if (Number(amount) > Number(payment.remainingAmount)) {
      toast({ title: t('error'), description: 'Amount exceeds remaining payment amount', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = payment.type === 'CUSTOMER'
        ? { saleId: selectedInvoiceId, amount: Number(amount) }
        : { purchaseId: selectedInvoiceId, amount: Number(amount) };

      await api.post(`/api/payments/${payment.id}/allocations`, payload);
      toast({ title: 'Allocation successful' });
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      onOpenChange(false);
      setAmount('');
      setSelectedInvoiceId('');
    } catch (err: any) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectInvoice = (val: string) => {
    setSelectedInvoiceId(val);
    const selected = options.find(o => o.id === val);
    if (selected) {
      // Auto-fill amount with the minimum of remaining payment or outstanding invoice amount
      const remainingPayment = Number(payment.remainingAmount);
      const outstandingInvoice = Number(selected.outstandingAmount);
      setAmount(Math.min(remainingPayment, outstandingInvoice).toFixed(3));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('payment_allocate')}</DialogTitle>
            <DialogDescription>
              Allocate this payment to an outstanding {payment.type === 'CUSTOMER' ? 'Sale Invoice' : 'Purchase Order'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-md flex justify-between">
              <span>{t('payment_remaining')}:</span>
              <span className="font-bold text-orange-600">{formatKWD(payment.remainingAmount)}</span>
            </div>

            <div className="space-y-2">
              <Label>Select Invoice / Order</Label>
              <Select value={selectedInvoiceId} onValueChange={handleSelectInvoice} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground text-center">No outstanding invoices found</div>
                  )}
                  {options.map((opt: any) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.number} (Outstanding: {formatKWD(opt.outstandingAmount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('payment_amount')}</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                max={payment.remainingAmount}
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedInvoiceId}>
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
