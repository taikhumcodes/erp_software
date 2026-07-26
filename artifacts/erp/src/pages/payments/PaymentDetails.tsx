import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatKWD } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useState } from 'react';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { PaymentAllocationDialog } from './PaymentAllocationDialog';
import { PaymentAttachmentManager } from './PaymentAttachmentManager';

interface PaymentDetailsProps {
  paymentId: string | null;
  onClose: () => void;
}

export function PaymentDetails({ paymentId, onClose }: PaymentDetailsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => api.get<{ data: Payment }>(`/api/payments/${paymentId}`),
    enabled: !!paymentId,
  });

  const payment = response?.data;

  const updateStatusMutation = useMutation({
    mutationFn: (status: 'COMPLETED' | 'CANCELLED') =>
      api.put(`/api/payments/${paymentId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      toast({ title: t('payment_status_updated') });
      setConfirmCompleteOpen(false);
      setConfirmCancelOpen(false);
    },
    onError: (err: any) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/payments/${paymentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast({ title: t('payment_deleted') });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  });

  const removeAllocationMutation = useMutation({
    mutationFn: (allocationId: string) => api.delete(`/api/payments/${paymentId}/allocations/${allocationId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      toast({ title: 'Allocation removed' });
    },
    onError: (err: any) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  });

  if (!payment) return null;

  const partyName = payment.type === 'CUSTOMER' ? payment.customer?.name : payment.supplier?.name;

  return (
    <>
      <Dialog open={!!paymentId} onOpenChange={(val) => !val && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  {payment.number}
                  <Badge variant={payment.status === 'COMPLETED' ? 'default' : payment.status === 'PENDING' ? 'secondary' : 'destructive'}>
                    {t(`payment_status_${payment.status.toLowerCase()}`)}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {t(`payment_type_${payment.type.toLowerCase()}`)} - {partyName}
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {payment.status === 'PENDING' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setAllocationOpen(true)}>
                      {t('payment_allocate')}
                    </Button>
                    <Button variant="outline" size="sm" className="text-green-600" onClick={() => setConfirmCompleteOpen(true)}>
                      <CheckCircle className="h-4 w-4 mr-2" /> {t('payment_status_completed')}
                    </Button>
                  </>
                )}
                {payment.status !== 'CANCELLED' && (
                  <Button variant="outline" size="sm" className="text-red-600" onClick={() => setConfirmCancelOpen(true)}>
                    <XCircle className="h-4 w-4 mr-2" /> {t('payment_status_cancelled')}
                  </Button>
                )}
                {payment.status === 'PENDING' && (
                  <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" /> {t('delete')}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('payment_amount')}</div>
                <div className="text-2xl font-bold">{formatKWD(payment.amount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('payment_allocated')}</div>
                <div className="text-2xl font-bold text-blue-600">{formatKWD(payment.allocatedAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('payment_remaining')}</div>
                <div className="text-2xl font-bold text-orange-600">{formatKWD(payment.remainingAmount)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">{t('payment_date')}</div>
                <div className="text-lg font-semibold">{new Date(payment.paymentDate).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">{t('payment_method')} & {t('payment_mode')}</h4>
              <p className="text-sm text-muted-foreground">
                {t(`payment_method_${payment.method.toLowerCase()}`)} / {t(`payment_mode_${payment.mode.toLowerCase()}`)}
              </p>
              {payment.referenceNumber && (
                <p className="text-sm text-muted-foreground mt-1">Ref: {payment.referenceNumber}</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">{t('payment_notes')}</h4>
              <p className="text-sm text-muted-foreground">{payment.notes || t('none')}</p>
            </div>
          </div>

          {/* Allocations Table */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('payment_allocations')}</h3>
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice / Order</TableHead>
                    <TableHead>Allocated By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.allocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No allocations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payment.allocations.map(alloc => (
                      <TableRow key={alloc.id}>
                        <TableCell className="font-medium">
                          {alloc.sale?.number || alloc.purchase?.number}
                        </TableCell>
                        <TableCell>{alloc.allocatedBy.name}</TableCell>
                        <TableCell>{new Date(alloc.allocatedAt).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">{formatKWD(alloc.amount)}</TableCell>
                        <TableCell>
                          {payment.status === 'PENDING' && (
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => removeAllocationMutation.mutate(alloc.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <PaymentAttachmentManager payment={payment} />

        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmCompleteOpen}
        onOpenChange={setConfirmCompleteOpen}
        title="Complete Payment?"
        description={Number(payment.remainingAmount) > 0 
          ? `Marking this payment as completed will finalize the allocations. You have ${formatKWD(payment.remainingAmount)} unallocated, which will be recorded as an advance payment to the party's balance. This action will lock the payment.`
          : "Marking this payment as completed will finalize the allocations and lock the payment."}
        onConfirm={() => updateStatusMutation.mutate('COMPLETED')}
        confirmText="Complete Payment"
        variant="default"
      />

      <ConfirmDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel Payment?"
        description="Are you sure you want to cancel this payment? Any finalized allocations will be reversed from the invoices and party's balance."
        onConfirm={() => updateStatusMutation.mutate('CANCELLED')}
        confirmText="Cancel Payment"
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={t('delete_payment_confirm')}
        description="This payment will be permanently deleted."
        onConfirm={() => deleteMutation.mutate()}
        confirmText={t('delete')}
        variant="destructive"
      />

      {allocationOpen && (
        <PaymentAllocationDialog
          payment={payment}
          open={allocationOpen}
          onOpenChange={setAllocationOpen}
        />
      )}
    </>
  );
}
