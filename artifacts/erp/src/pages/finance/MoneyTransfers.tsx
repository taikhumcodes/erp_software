import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import type { MoneyTransfer, FinanceAccount } from '@/lib/finance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ArrowRight, Plus } from 'lucide-react';

export default function MoneyTransfers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['finance-transfers'], queryFn: () => FinanceAPI.getTransfers() });
  const transfers: MoneyTransfer[] = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Money Transfers</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal funds transfer between accounts</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Transfer</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>From Account</TableHead>
                <TableHead>To Account</TableHead>
                <TableHead className="text-right">Amount (KWD)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transfers recorded</TableCell></TableRow>
              ) : (
                transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{format(new Date(t.transferDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{t.number}</TableCell>
                    <TableCell className="font-medium text-red-600">{t.fromAccount.name}</TableCell>
                    <TableCell className="font-medium text-emerald-600">{t.toAccount.name}</TableCell>
                    <TableCell className="text-right font-bold">{Number(t.amount).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.createdBy.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

function TransferModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({ queryKey: ['finance-accounts'], queryFn: () => FinanceAPI.getAccounts() });
  const accounts: FinanceAccount[] = accountsData?.data?.filter((a: any) => a.status === 'ACTIVE') || [];

  const mut = useMutation({
    mutationFn: (data: any) => FinanceAPI.createTransfer(data),
    onSuccess: () => {
      toast({ title: 'Transfer successful' });
      queryClient.invalidateQueries({ queryKey: ['finance-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  const fromAcc = accounts.find(a => a.id === fromAccountId);

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Money Transfer</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">From Account</label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
              {fromAcc && <p className="text-xs text-muted-foreground mt-1">Bal: {Number(fromAcc.calculatedBalance).toFixed(3)}</p>}
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground mt-4" />
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">To Account</label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Amount (KWD)</label>
            <Input type="number" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Replenish cash drawer" />
          </div>
          <div>
            <label className="text-sm font-medium">Reference Number (Optional)</label>
            <Input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="Bank Tx ID" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate({ fromAccountId, toAccountId, amount, description, referenceNumber })} disabled={mut.isPending || !fromAccountId || !toAccountId || !amount}>
            {mut.isPending ? 'Processing...' : 'Transfer Funds'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
