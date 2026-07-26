import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatKWD } from '@/lib/utils';
import type { Customer, Supplier, PaymentType, PaymentMethodType, PaymentMode, PaginatedResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PaymentForm({ open, onOpenChange, onSuccess }: PaymentFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<PaymentType>('CUSTOMER');
  const [method, setMethod] = useState<PaymentMethodType>('CASH');
  const [mode, setMode] = useState<PaymentMode>('IMMEDIATE');
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const { data: customersResponse, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers', { limit: 1000 }],
    queryFn: () => api.get<PaginatedResponse<Customer>>('/api/customers?limit=1000'),
    enabled: type === 'CUSTOMER' && open,
  });

  const { data: suppliersResponse, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers', { limit: 1000 }],
    queryFn: () => api.get<PaginatedResponse<Supplier>>('/api/suppliers?limit=1000'),
    enabled: type === 'SUPPLIER' && open,
  });

  const customers = customersResponse?.data || [];
  const suppliers = suppliersResponse?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyId || !amount || Number(amount) <= 0) {
      toast({ title: t('error'), description: 'Please fill all required fields correctly', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        method,
        mode,
        customerId: type === 'CUSTOMER' ? partyId : undefined,
        supplierId: type === 'SUPPLIER' ? partyId : undefined,
        amount: Number(amount),
        paymentDate: new Date(paymentDate).toISOString(),
        referenceNumber,
        notes
      };

      const res = await api.post<{ data: { id: string } }>('/api/payments', payload);
      const paymentId = res.data.id;

      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('category', 'PAYMENT_PROOF');
        await api.postFormData(`/api/payments/${paymentId}/attachments`, formData);
      }

      toast({ title: t('payment_created') });
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setType('CUSTOMER');
    setMethod('CASH');
    setMode('IMMEDIATE');
    setPartyId('');
    setAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setNotes('');
    setProofFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) resetForm();
    }}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('payment_add')}</DialogTitle>
            <DialogDescription>
              Record a new payment transaction.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>{t('payment_type')}</Label>
              <Select value={type} onValueChange={(val: PaymentType) => { setType(val); setPartyId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">{t('payment_type_customer')}</SelectItem>
                  <SelectItem value="SUPPLIER">{t('payment_type_supplier')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('payment_party')} *</Label>
              <Select value={partyId} onValueChange={setPartyId} disabled={type === 'CUSTOMER' ? isLoadingCustomers : isLoadingSuppliers}>
                <SelectTrigger><SelectValue placeholder={t('select_party', 'Select Party...')} /></SelectTrigger>
                <SelectContent>
                  {type === 'CUSTOMER' ? (
                    customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({formatKWD(c.balance)})</SelectItem>)
                  ) : (
                    suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({formatKWD(s.balance)})</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('payment_method')}</Label>
              <Select value={method} onValueChange={(val: PaymentMethodType) => setMethod(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t('payment_method_cash')}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t('payment_method_bank_transfer')}</SelectItem>
                  <SelectItem value="CHEQUE">{t('payment_method_cheque')}</SelectItem>
                  <SelectItem value="CREDIT_CARD">{t('payment_method_card')}</SelectItem>
                  <SelectItem value="ONLINE_TRANSFER">{t('payment_method_online')}</SelectItem>
                  <SelectItem value="OTHER">{t('payment_method_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('payment_mode')}</Label>
              <Select value={mode} onValueChange={(val: PaymentMode) => setMode(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IMMEDIATE">{t('payment_mode_immediate')}</SelectItem>
                  <SelectItem value="ADVANCE">{t('payment_mode_advance')}</SelectItem>
                  <SelectItem value="SETTLEMENT">{t('payment_mode_settlement')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('payment_amount')} (KWD) *</Label>
              <Input type="number" step="0.001" min="0.001" required value={amount} onChange={e => setAmount(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{t('payment_date')} *</Label>
              <Input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t('payment_reference')} ({t('optional')})</Label>
              <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t('payment_notes')} ({t('optional')})</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>{t('attach_proof_of_payment')} ({t('optional')})</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] || null)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
