import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';

import { api } from '@/lib/api';
import type { Customer, Product, OrderSource } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

interface CreateDeliveryOrderProps {
  onBack: () => void;
  onSuccess: (id: string) => void;
}

export function CreateDeliveryOrder({ onBack, onSuccess }: CreateDeliveryOrderProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [orderType, setOrderType] = useState<OrderSource>('DIRECT');
  const [customerPONumber, setCustomerPONumber] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [contactNumber, setContactNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [internalNotes, setInternalNotes] = useState<string>('');
  
  const [items, setItems] = useState<DOItemForm[]>([emptyItem()]);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers', { limit: 1000 }],
    queryFn: () => api.get<{ data: Customer[] }>('/api/customers?limit=1000'),
  });
  const customers = customersResponse?.data || [];

  const { data: productsResponse } = useQuery({
    queryKey: ['products', { limit: 1000 }],
    queryFn: () => api.get<{ data: Product[] }>('/api/products?limit=1000'),
  });
  const products = productsResponse?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post<{ data: { id: string } }>('/api/delivery-orders', data),
    onSuccess: (res) => {
      toast({ title: t('do_created') });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-orders-stats'] });
      onSuccess(res.data.id);
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
    if (!customerId) return;
    if (orderType === 'CUSTOMER_PO' && !customerPONumber) {
      toast({ title: 'Error', description: 'Customer PO Number is required', variant: 'destructive' });
      return;
    }
    
    const finalItems = items.filter(i => i.productId && parseFloat(i.deliveredQuantity) > 0);
    
    if (finalItems.length === 0) {
      toast({ title: 'Error', description: t('do_no_items'), variant: 'destructive' });
      return;
    }

    createMutation.mutate({
      customerId,
      orderType,
      customerPONumber: customerPONumber || undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
      deliveryAddress: deliveryAddress || undefined,
      driverName: driverName || undefined,
      vehicleNumber: vehicleNumber || undefined,
      receiverName: receiverName || undefined,
      contactNumber: contactNumber || undefined,
      notes: notes || undefined,
      internalNotes: internalNotes || undefined,
      items: finalItems.map(i => ({
        productId: i.productId,
        quantity: parseFloat(i.deliveredQuantity),
        remarks: i.remarks || undefined,
      }))
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{t('do_create')}</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('do_order_source')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup 
              value={orderType} 
              onValueChange={(v) => setOrderType(v as OrderSource)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DIRECT" id="r1" />
                <Label htmlFor="r1">{t('do_order_source_direct')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CUSTOMER_PO" id="r2" />
                <Label htmlFor="r2">{t('do_order_source_customer_po')}</Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('do_customer')} *</Label>
                <Select value={customerId} onValueChange={setCustomerId} required>
                  <SelectTrigger>
                    <SelectValue placeholder={t('do_select_customer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.code ? `(${c.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {orderType === 'CUSTOMER_PO' && (
                <div className="space-y-2">
                  <Label>{t('do_customer_po')} *</Label>
                  <Input 
                    value={customerPONumber} 
                    onChange={e => setCustomerPONumber(e.target.value)} 
                    placeholder="PO-XXXX"
                    required
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('do_items')}</CardTitle>
            <CardDescription>{t('do_items_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('do_item_product')} *</TableHead>
                    <TableHead>{t('do_item_qty')} *</TableHead>
                    <TableHead>{t('do_item_remarks')}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell>
                        <Select 
                          value={item.productId} 
                          onValueChange={(val) => updateItem(item.key, 'productId', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_product')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {i18n.language === 'ar' && p.nameAr ? p.nameAr : p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      <TableCell>
                        <Input 
                          type="number" min="0.001" step="0.001" 
                          value={item.deliveredQuantity}
                          onChange={(e) => updateItem(item.key, 'deliveredQuantity', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={item.remarks}
                          onChange={(e) => updateItem(item.key, 'remarks', e.target.value)}
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
              {t('do_add_item')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('do_notes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('do_notes')}</Label>
              <Textarea 
                placeholder={t('do_notes_placeholder')} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows={3} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t('do_internal_notes')}</Label>
              <Textarea 
                placeholder={t('do_internal_notes_placeholder')} 
                value={internalNotes} 
                onChange={(e) => setInternalNotes(e.target.value)} 
                rows={3} 
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={createMutation.isPending}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {t('save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
