import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Eye, Download, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PaymentAttachmentManagerProps {
  payment: Payment;
}

export function PaymentAttachmentManager({ payment }: PaymentAttachmentManagerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>('OTHER');
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      // Using fetch directly because api wrapper doesn't handle FormData well
      const token = localStorage.getItem('erp_access_token');
      const response = await fetch(`/api/payments/${payment.id}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      toast({ title: 'Attachment uploaded successfully' });
      setFile(null);
      setCategory('OTHER');
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    },
    onError: (err: any) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/api/payments/${payment.id}/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', payment.id] });
      toast({ title: 'Attachment deleted' });
    },
    onError: (err: any) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
    }
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t('error'), description: 'File size must be less than 10MB', variant: 'destructive' });
        return;
      }
      uploadMutation.mutate();
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-4">{t('payment_attachments')}</h3>
      
      {payment.status === 'PENDING' && (
        <form onSubmit={handleUpload} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg mb-4 border border-dashed">
          <div className="space-y-2 flex-1">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
                <SelectItem value="BANK_RECEIPT">Bank Receipt</SelectItem>
                <SelectItem value="HANDWRITTEN_SLIP">Handwritten Slip</SelectItem>
                <SelectItem value="PAYMENT_PROOF">Payment Proof</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2 flex-1">
            <Label>Select File (Max 10MB)</Label>
            <Input 
              id="file-upload" 
              type="file" 
              className="bg-background cursor-pointer"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
            />
          </div>

          <Button type="submit" disabled={!file || uploadMutation.isPending} className="w-32">
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? t('saving') : 'Upload'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payment.attachments.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground border rounded-lg">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
            No attachments found.
          </div>
        ) : (
          payment.attachments.map((att) => (
            <div key={att.id} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-primary/10 p-2 rounded-md shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" title={att.originalName}>
                    {att.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{att.category.replace('_', ' ').toLowerCase()}</span>
                    <span>&bull;</span>
                    <span>{(att.size / 1024 / 1024).toFixed(2)} MB</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('erp_access_token');
                      const res = await fetch(`/api/payments/${payment.id}/attachments/${att.id}/preview`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (!res.ok) throw new Error('Preview failed');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      window.open(url, '_blank');
                    } catch (err: any) {
                      toast({ title: t('error'), description: err.message, variant: 'destructive' });
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('erp_access_token');
                      const res = await fetch(`/api/payments/${payment.id}/attachments/${att.id}/download`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (!res.ok) throw new Error('Download failed');
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = att.originalName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                    } catch (err: any) {
                      toast({ title: t('error'), description: err.message, variant: 'destructive' });
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {payment.status === 'PENDING' && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm('Delete attachment?')) deleteMutation.mutate(att.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
