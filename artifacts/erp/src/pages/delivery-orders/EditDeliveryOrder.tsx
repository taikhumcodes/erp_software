import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Info } from 'lucide-react';

import { api } from '@/lib/api';
import type { DeliveryOrder, SalesOrderDetails } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface EditDeliveryOrderProps {
  id: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function EditDeliveryOrder({ id, onBack, onSuccess }: EditDeliveryOrderProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  
  const [items, setItems] = useState<Array<{ productId: string; deliveredQuantity: string; remarks: string }>>([]);

  const doQuery = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => api.get<{ data: DeliveryOrder }>(`/api/delivery-orders/${id}`),
  });

  const deliveryOrder = doQuery.data?.data;


  useEffect(() => {
    if (deliveryOrder) {
      setDeliveryDate(deliveryOrder.deliveryDate ? new Date(deliveryOrder.deliveryDate).toISOString().slice(0, 10) : '');
      setDeliveryAddress(deliveryOrder.deliveryAddress || '');
      setDriverName(deliveryOrder.driverName || '');
      setVehicleNumber(deliveryOrder.vehicleNumber || '');
      setReceiverName(deliveryOrder.receiverName || '');
      setContactNumber(deliveryOrder.contactNumber || '');
      setNotes(deliveryOrder.notes || '');
      setInternalNotes(deliveryOrder.internalNotes || '');
      
      setItems(deliveryOrder.items.map(i => ({
        productId: i.productId,
        deliveredQuantity: i.quantity.toString(),
        remarks: i.remarks || ''
      })));
    }
  }, [deliveryOrder]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put<{ data: DeliveryOrder }>(`/api/delivery-orders/${id}`, data),
    onSuccess: () => {
      toast({ title: t('do_updated') });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-order', id] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out items with 0 quantity
    const finalItems = items.filter(i => parseFloat(i.deliveredQuantity) > 0);
    
    if (finalItems.length === 0) {
      toast({ title: 'Error', description: t('do_no_items'), variant: 'destructive' });
      return;
    }

    updateMutation.mutate({
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      deliveryAddress: deliveryAddress || null,
      driverName: driverName || null,
      vehicleNumber: vehicleNumber || null,
      receiverName: receiverName || null,
      contactNumber: contactNumber || null,
      notes: notes || null,
      internalNotes: internalNotes || null,
      items: finalItems.map(i => ({
        productId: i.productId,
        quantity: parseFloat(i.deliveredQuantity),
        remarks: i.remarks || null
      }))
    });
  };

  const handleQuantityChange = (productId: string, val: string) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, deliveredQuantity: val } : i));
  };

  const handleRemarksChange = (productId: string, val: string) => {
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, remarks: val } : i));
  };


  if (doQuery.isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!deliveryOrder) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t('do_edit')}: {deliveryOrder.number}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('do_sales_order')}</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveryOrder && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted p-4 rounded-md">
                <div>
                  <span className="text-muted-foreground block">{t('do_sales_order')}</span>
                  <span className="font-medium font-mono">{deliveryOrder.internalSONumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('do_customer')}</span>
                  <span className="font-medium">{deliveryOrder.customer.name} ({deliveryOrder.customer.code})</span>
                </div>
                {deliveryOrder.customerPONumber && (
                  <div>
                    <span className="text-muted-foreground block">{t('do_customer_po')}</span>
                    <span className="font-medium">{deliveryOrder.customerPONumber}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {deliveryOrder && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('do_delivery_details')}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('do_delivery_date')}</Label>
                  <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('do_delivery_address')}</Label>
                  <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('do_driver_name')}</Label>
                  <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('do_vehicle_number')}</Label>
                  <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('do_receiver_name')}</Label>
                  <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('do_contact_number')}</Label>
                  <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('do_notes')}</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>{t('do_internal_notes')}</Label>
                  <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                </div>
              </CardContent>
            </Card>

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
                        <TableHead>{t('do_item_qty')} *</TableHead>
                        <TableHead>{t('do_item_remarks')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryOrder.items.map((item) => {
                        const formItem = items.find(i => i.productId === item.productId);
                        const currentVal = formItem?.deliveredQuantity || '0';
                        
                        return (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div className="font-medium">{item.product.name}</div>
                              {item.product.nameAr && <div className="text-xs text-muted-foreground">{item.product.nameAr}</div>}
                              <div className="text-xs text-muted-foreground">{item.product.sku}</div>
                            </TableCell>

                            <TableCell>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.001" 
                                className="w-32"
                                value={currentVal}
                                onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input 
                                value={formItem?.remarks || ''}
                                onChange={(e) => handleRemarksChange(item.productId, e.target.value)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                
                <Alert className="mt-4 bg-muted border-none">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>
                    Items with 0 delivered quantity will not be included in the delivery order.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onBack}>{t('cancel')}</Button>
              <Button type="submit" disabled={updateMutation.isPending || items.length === 0}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
