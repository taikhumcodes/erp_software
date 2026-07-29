import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download, Truck, Check, CheckCircle, XCircle, MoreHorizontal, Loader2, Play } from 'lucide-react';

import { api } from '@/lib/api';
import type { DeliveryOrder, DeliveryOrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const STATUS_COLORS: Record<DeliveryOrderStatus, string> = {
  DRAFT: 'border-yellow-500 text-yellow-600',
  APPROVED: 'border-blue-500 text-blue-600',
  DISPATCHED: 'border-orange-500 text-orange-600 bg-orange-50',
  DELIVERED: 'border-green-500 text-green-600 bg-green-50',
  CANCELLED: 'border-destructive text-destructive bg-destructive/10',
};

interface DeliveryOrderDetailsProps {
  id: string;
  onBack: () => void;
}

export function DeliveryOrderDetails({ id, onBack }: DeliveryOrderDetailsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const doQuery = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => api.get<{ data: DeliveryOrder }>(`/api/delivery-orders/${id}`),
  });

  const deliveryOrder = doQuery.data?.data;

  const statusMutation = useMutation({
    mutationFn: (data: { status: DeliveryOrderStatus; cancelReason?: string }) => api.patch(`/api/delivery-orders/${id}/status`, data),
    onSuccess: () => {
      toast({ title: t('do_status_updated') });
      queryClient.invalidateQueries({ queryKey: ['delivery-order', id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders-stats'] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
    onSettled: () => setIsUpdatingStatus(false)
  });

  const handleStatusChange = (newStatus: DeliveryOrderStatus) => {
    let cancelReason: string | null = null;
    if (newStatus === 'CANCELLED') {
      cancelReason = window.prompt(t('do_cancel_reason_prompt') || 'Please enter a reason for cancellation:');
      if (!cancelReason) return;
    } else {
      if (!confirm(t('do_confirm_status_desc'))) return;
    }

    setIsUpdatingStatus(true);
    statusMutation.mutate({ status: newStatus, cancelReason: cancelReason || undefined });
  };

  if (doQuery.isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!deliveryOrder) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t('do_view')}: {deliveryOrder.number}</h1>
          <Badge variant="outline" className={STATUS_COLORS[deliveryOrder.status]}>
            {t(`do_stat_${deliveryOrder.status.toLowerCase()}`)}
          </Badge>
          {isUpdatingStatus && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                {t('do_status')}
                <MoreHorizontal className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {deliveryOrder.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => handleStatusChange('APPROVED')}>
                  <Check className="mr-2 h-4 w-4 text-blue-500" />
                  {t('do_approve')}
                </DropdownMenuItem>
              )}
              {deliveryOrder.status === 'APPROVED' && (
                <DropdownMenuItem onClick={() => handleStatusChange('DISPATCHED')}>
                  <Truck className="mr-2 h-4 w-4 text-orange-500" />
                  {t('do_dispatch')}
                </DropdownMenuItem>
              )}
              {deliveryOrder.status === 'DISPATCHED' && (
                <DropdownMenuItem onClick={() => handleStatusChange('DELIVERED')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  {t('do_deliver')}
                </DropdownMenuItem>
              )}
              
              {['DRAFT', 'APPROVED', 'DISPATCHED'].includes(deliveryOrder.status) && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => handleStatusChange('CANCELLED')}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('do_cancel')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => window.open(`/documents/delivery-order/${deliveryOrder.id}?print=true`, '_blank')}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={() => window.open(`/documents/delivery-order/${deliveryOrder.id}`, '_blank')}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('do_customer')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_customer')}:</span>
              <span className="font-medium">{deliveryOrder.customer.name} ({deliveryOrder.customer.code})</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_sales_order')}:</span>
              <span className="font-mono">{deliveryOrder.internalSONumber}</span>
            </div>
            {deliveryOrder.customerPONumber && (
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">{t('do_customer_po')}:</span>
                <span>{deliveryOrder.customerPONumber}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_order_source')}:</span>
              <span>{t(`do_order_source_${deliveryOrder.orderType.toLowerCase()}`)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('do_delivery_details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_delivery_date')}:</span>
              <span>{deliveryOrder.deliveryDate ? new Date(deliveryOrder.deliveryDate).toLocaleDateString() : '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_delivery_address')}:</span>
              <span>{deliveryOrder.deliveryAddress || '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_driver_name')}:</span>
              <span>{deliveryOrder.driverName || '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_vehicle_number')}:</span>
              <span>{deliveryOrder.vehicleNumber || '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_receiver_name')}:</span>
              <span>{deliveryOrder.receiverName || '-'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">{t('do_contact_number')}:</span>
              <span>{deliveryOrder.contactNumber || '-'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('do_items')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('do_item_product')}</TableHead>
                  <TableHead>{t('do_item_ordered')}</TableHead>
                  <TableHead>{t('do_item_delivered')}</TableHead>
                  <TableHead>{t('do_item_remarks')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryOrder.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                    </TableCell>
                    <TableCell>{item.quantity} {item.product.unit.abbreviation}</TableCell>
                    <TableCell className="font-medium">
                      {item.quantity} {item.product.unit.abbreviation}
                    </TableCell>
                    <TableCell>{item.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(deliveryOrder.notes || deliveryOrder.internalNotes) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('do_notes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveryOrder.notes && (
              <div>
                <Label className="text-muted-foreground mb-1 block">{t('do_notes')}</Label>
                <p className="text-sm whitespace-pre-wrap">{deliveryOrder.notes}</p>
              </div>
            )}
            {deliveryOrder.internalNotes && (
              <div>
                <Label className="text-muted-foreground mb-1 block">{t('do_internal_notes')}</Label>
                <p className="text-sm whitespace-pre-wrap">{deliveryOrder.internalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {deliveryOrder.history && deliveryOrder.history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('do_audit_trail')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliveryOrder.history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-4 text-sm">
                  <div className="mt-0.5">
                    <Play className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">{entry.user.name}</span>
                      <span className="text-muted-foreground">changed status to</span>
                      <Badge variant="outline" className={STATUS_COLORS[entry.toStatus]}>
                        {t(`do_stat_${entry.toStatus.toLowerCase()}`)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                    {entry.notes && (
                      <div className="text-xs mt-1 text-muted-foreground bg-muted p-2 rounded">
                        {entry.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
