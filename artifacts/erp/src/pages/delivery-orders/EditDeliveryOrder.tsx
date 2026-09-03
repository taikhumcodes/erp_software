import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Info, Plus, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import type { DeliveryOrder, Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ProductCombobox } from '@/components/ui/product-combobox';

interface DOItemForm {
  key: string;
  productId: string;
  deliveredQuantity: string;
  remarks: string;
}

let _itemKey = 0;
const nextKey = () => `item-${++_itemKey}`;

const emptyItem = (): DOItemForm => ({
  key: nextKey(),
  productId: '',
  deliveredQuantity: '1',
  remarks: '',
});

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
  
  const [items, setItems] = useState<DOItemForm[]>([]);

  const doQuery = useQuery({
    queryKey: ['delivery-order', id],
    queryFn: () => api.get<{ data: DeliveryOrder }>(`/api/delivery-orders/${id}`),
  });

  const productsQuery = useQuery({
    queryKey: ['products-for-do'],
    queryFn: () => api.get<{ data: Product[] }>('/api/products?limit=500&isActive=true'),
  });

  const deliveryOrder = doQuery.data?.data;
  const products = productsQuery.data?.data || [];

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
      
      if (deliveryOrder.items && deliveryOrder.items.length > 0) {
        setItems(deliveryOrder.items.map(i => ({
          key: nextKey(),
          productId: i.productId,
          deliveredQuantity: i.quantity.toString(),
          remarks: i.remarks || ''
        })));
      } else {
        setItems([emptyItem()]);
      }
    }
  }, [deliveryOrder]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put<{ data: DeliveryOrder }>(`/api/delivery-orders/${id}`, data),
    onSuccess: () => {
      toast({ title: t('do_updated') || 'Delivery order updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-order', id] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  });

  const updateItem = (key: string, field: keyof DOItemForm, value: string) => {
    setItems(prev => prev.map(it => it.key === key ? { ...it, [field]: value } : it));
  };

  const removeItem = (key: string) => {
    setItems(prev => prev.filter(it => it.key !== key));
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyItem()]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out items without productId or with <= 0 quantity
    const finalItems = items.filter(i => i.productId && parseFloat(i.deliveredQuantity) > 0);
    
    if (finalItems.length === 0) {
      toast({ title: 'Error', description: t('do_no_items') || 'At least one product with quantity greater than 0 is required', variant: 'destructive' });
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

  if (doQuery.isLoading || productsQuery.isLoading) {
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
          <h1 className="text-2xl font-bold tracking-tight">{t('do_edit') || 'Edit Delivery Order'}: {deliveryOrder.number}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('do_sales_order') || 'Order Reference'}</CardTitle>
          </CardHeader>
          <CardContent>
            {deliveryOrder && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted p-4 rounded-md">
                <div>
                  <span className="text-muted-foreground block">{t('do_sales_order') || 'Sales Order'}</span>
                  <span className="font-medium font-mono">{deliveryOrder.internalSONumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('do_customer') || 'Customer'}</span>
                  <span className="font-medium">{deliveryOrder.customer.name} ({deliveryOrder.customer.code})</span>
                </div>
                {deliveryOrder.customerPONumber && (
                  <div>
                    <span className="text-muted-foreground block">{t('do_customer_po') || 'Customer PO'}</span>
                    <span className="font-medium">{deliveryOrder.customerPONumber}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('do_delivery_details') || 'Delivery Details'}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('do_delivery_date') || 'Delivery Date'} *</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('do_delivery_address') || 'Delivery Address'}</Label>
              <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('do_driver_name') || 'Driver Name'}</Label>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('do_vehicle_number') || 'Vehicle Number'}</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('do_receiver_name') || 'Receiver Name'}</Label>
              <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('do_contact_number') || 'Contact Number'}</Label>
              <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('do_notes') || 'Notes'}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('do_internal_notes') || 'Internal Notes'}</Label>
              <Textarea value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('do_items') || 'Items'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">{t('do_item_product') || 'Product'} *</TableHead>
                    <TableHead className="w-[140px]">{t('do_item_qty') || 'Quantity'} *</TableHead>
                    <TableHead>{t('do_item_remarks') || 'Remarks'}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <ProductCombobox
                          products={products}
                          value={item.productId}
                          onSelect={(val) => updateItem(item.key, 'productId', val)}
                          placeholder={t('select_product') || 'Select product...'}
                        />
                      </TableCell>

                      <TableCell>
                        <Input 
                          type="number" 
                          min="0.001" 
                          step="0.001" 
                          className="w-32"
                          value={item.deliveredQuantity}
                          onChange={(e) => updateItem(item.key, 'deliveredQuantity', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.remarks}
                          onChange={(e) => updateItem(item.key, 'remarks', e.target.value)}
                          placeholder="Optional remarks"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.key)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('do_add_item') || 'Add Item'}
            </Button>

            <Alert className="mt-4 bg-muted border-none">
              <Info className="h-4 w-4" />
              <AlertTitle>Note</AlertTitle>
              <AlertDescription>
                Items with 0 quantity or unselected products will not be included in the delivery order.
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
      </form>
    </div>
  );
}
