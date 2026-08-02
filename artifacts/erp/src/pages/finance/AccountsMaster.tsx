import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import type { FinanceAccount, FinanceAccountType, AccountStatus } from '@/lib/finance-types';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Building2, MoreHorizontal, History, PlusCircle, ArrowDownToLine } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACCOUNT_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-800',
  BANK: 'bg-blue-100 text-blue-800',
  WALLET: 'bg-violet-100 text-violet-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-yellow-100 text-yellow-800',
  ARCHIVED: 'bg-gray-200 text-gray-600',
};

export default function AccountsMaster() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<FinanceAccount | null>(null);
  const [depositTarget, setDepositTarget] = useState<FinanceAccount | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['finance-accounts'],
    queryFn: () => FinanceAPI.getAccounts(),
  });

  const accounts: FinanceAccount[] = data?.data || [];

  const filtered = accounts.filter(a =>
    a.type !== 'PARTNER_CAPITAL' && (
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.bankName && a.bankName.toLowerCase().includes(search.toLowerCase())) ||
      (a.accountNumber && a.accountNumber.includes(search))
    )
  );

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AccountStatus }) => FinanceAPI.changeAccountStatus(id, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts Master</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage financial accounts and balances</p>
        </div>
        <Button onClick={() => { setEditingId(null); setIsModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Account
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(acc => (
          <Card key={acc.id} className="hover:shadow-md transition-shadow relative">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <Badge variant="outline" className={`text-xs mb-2 ${ACCOUNT_COLORS[acc.type]}`}>
                    {acc.type}
                  </Badge>
                  {acc.isDefault && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                  <h3 className="font-bold text-lg">{acc.name}</h3>
                  {(acc.bankName || acc.accountNumber) && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                      <Building2 className="w-3 h-3 mr-1" />
                      {acc.bankName} {acc.accountNumber ? `· ${acc.accountNumber}` : ''}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="-mr-2 -mt-2"><MoreHorizontal className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setLocation(`/finance/ledger/${acc.id}`)}>
                      <History className="w-4 h-4 mr-2" /> View Ledger
                    </DropdownMenuItem>
                    {acc.status === 'ACTIVE' && (
                      <DropdownMenuItem onClick={() => setDepositTarget(acc)}>
                        <ArrowDownToLine className="w-4 h-4 mr-2 text-green-600" />
                        <span className="text-green-700 font-medium">Deposit Money</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => { setEditingId(acc.id); setIsModalOpen(true); }}>
                      Edit Account
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {acc.status !== 'ACTIVE' && (
                      <DropdownMenuItem onClick={() => statusMut.mutate({ id: acc.id, status: 'ACTIVE' })}>
                        Mark as Active
                      </DropdownMenuItem>
                    )}
                    {acc.status === 'ACTIVE' && (
                      <DropdownMenuItem onClick={() => statusMut.mutate({ id: acc.id, status: 'INACTIVE' })}>
                        Mark as Inactive
                      </DropdownMenuItem>
                    )}
                    {acc.status !== 'ARCHIVED' && (
                      <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeletingAccount(acc)}>
                        Secure Archive
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="mt-5 pt-4 border-t flex justify-between items-end">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Current Balance</p>
                  <p className="text-xl font-bold mt-1 text-primary">
                    {Number(acc.calculatedBalance).toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_COLORS[acc.status]}>{acc.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AccountFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingId={editingId}
        account={accounts.find(a => a.id === editingId)}
      />

      <DepositModal
        account={depositTarget}
        onClose={() => setDepositTarget(null)}
      />

      <SecureDeleteModal
        account={deletingAccount}
        accounts={accounts}
        onClose={() => setDeletingAccount(null)}
      />
    </div>
  );
}

// ─── Deposit Money Modal ─────────────────────────────────────────────────────

function DepositModal({ account, onClose }: { account: FinanceAccount | null; onClose: () => void }) {
  const [adjustmentType, setAdjustmentType] = useState('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: (data: any) => FinanceAPI.createAdjustment(account!.id, data),
    onSuccess: () => {
      toast({ title: 'Deposit successful', description: `Amount deposited into ${account?.name}. Ledger entry created.` });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger', account?.id] });
      onClose();
      setAmount('');
      setDescription('');
      setReferenceNumber('');
      setAdjustmentType('DEPOSIT');
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed', description: err.message }),
  });

  const handleSubmit = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ variant: 'destructive', title: 'Invalid amount', description: 'Please enter a valid positive amount.' });
      return;
    }
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Description required', description: 'Please enter a description.' });
      return;
    }
    mut.mutate({ adjustmentType, amount: Number(amount), description: description.trim(), referenceNumber: referenceNumber.trim() || undefined });
  };

  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-green-600" />
            Deposit Money
          </DialogTitle>
          {account && (
            <p className="text-sm text-muted-foreground">Depositing into: <strong>{account.name}</strong></p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Deposit Type */}
          <div className="space-y-1">
            <Label>Deposit Type</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEPOSIT">Cash Deposit</SelectItem>
                <SelectItem value="OWNER_INVESTMENT">Owner / Partner Investment</SelectItem>
                <SelectItem value="BANK_INTEREST">Bank Interest Earned</SelectItem>
                <SelectItem value="MISC_INCOME">Miscellaneous Income</SelectItem>
                <SelectItem value="OPENING_BALANCE">Opening Balance Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label>Amount (KWD) <span className="text-red-500">*</span></Label>
            <Input
              id="deposit-amount"
              type="number"
              min="0.001"
              step="0.001"
              placeholder="0.000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onFocus={e => e.target.select()}
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="deposit-description"
              placeholder="e.g. Cash deposit from sales, Bank transfer received..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Reference Number (optional) */}
          <div className="space-y-1">
            <Label>Reference / Voucher No. <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Input
              id="deposit-reference"
              placeholder="e.g. TXN-2026-001"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
            />
          </div>

          <div className="rounded-md bg-green-50 border border-green-200 p-3 text-xs text-green-800">
            ✅ A ledger entry will be automatically created for this deposit and will appear in the account's transaction history.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mut.isPending}>Cancel</Button>
          <Button
            id="deposit-submit-btn"
            onClick={handleSubmit}
            disabled={mut.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {mut.isPending ? 'Processing...' : 'Confirm Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Simple Account Form Modal ───────────────────────────────────────────────

function AccountFormModal({ isOpen, onClose, editingId, account }: { isOpen: boolean, onClose: () => void, editingId: string | null, account?: FinanceAccount }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FinanceAccountType>('BANK');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [isDefault, setIsDefault] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mut = useMutation({
    mutationFn: (data: any) => editingId ? FinanceAPI.updateAccount(editingId, data) : FinanceAPI.createAccount(data),
    onSuccess: () => {
      toast({ title: editingId ? 'Account updated' : 'Account created' });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => {
      if (open) {
        setName(account?.name || '');
        setType(account?.type || 'BANK');
        setBankName(account?.bankName || '');
        setAccountNumber(account?.accountNumber || '');
        setOpeningBalance(account?.openingBalance || '0');
        setIsDefault(account?.isDefault || false);
      } else {
        onClose();
      }
    }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editingId ? 'Edit Account' : 'New Account'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main KFH Account" />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <select value={type} onChange={e => setType(e.target.value as FinanceAccountType)} className="w-full h-10 px-3 rounded-md border bg-background">
              <option value="BANK">Bank</option>
              <option value="CASH">Cash Drawer</option>
              <option value="WALLET">Digital Wallet</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          {type === 'BANK' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Bank Name</label>
                <Input value={bankName} onChange={e => setBankName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Account No.</label>
                <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
              </div>
            </div>
          )}
          {!editingId && (
            <div>
              <label className="text-sm font-medium">Opening Balance (KWD)</label>
              <Input type="number" step="0.001" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} />
            </div>
          )}
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded" />
            <span className="text-sm">Set as default account</span>
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate({ name, type, bankName, accountNumber, openingBalance, isDefault })} disabled={mut.isPending}>
            {mut.isPending ? 'Saving...' : 'Save Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SecureDeleteModal({ account, accounts, onClose }: { account: FinanceAccount | null, accounts: FinanceAccount[], onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: (data: any) => FinanceAPI.secureArchiveAccount(account!.id, data),
    onSuccess: () => {
      toast({ title: 'Account archived successfully' });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      setPassword('');
      setTransferAccountId('');
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message || 'Verification failed' }),
  });

  if (!account) return null;

  const hasBalance = Number(account.calculatedBalance) > 0;
  const availableTransferAccounts = accounts.filter(a => a.id !== account.id && a.status === 'ACTIVE');

  return (
    <Dialog open={!!account} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle className="text-red-600">Secure Archive Account</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            You are about to archive <strong>{account.name}</strong>. This requires your owner password.
          </p>

          {hasBalance && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-md text-sm space-y-3">
              <p>
                This account has a balance of <strong>{Number(account.calculatedBalance).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</strong>.
                You must select a destination account to transfer these funds before archiving.
              </p>
              <div>
                <label className="text-xs font-semibold mb-1 block">Transfer To</label>
                <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                  <SelectTrigger className="bg-white"><SelectValue placeholder="Select active account" /></SelectTrigger>
                  <SelectContent>
                    {availableTransferAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Owner Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            variant="destructive"
            onClick={() => mut.mutate({ password, transferAccountId: hasBalance ? transferAccountId : undefined })} 
            disabled={mut.isPending || !password || (hasBalance && !transferAccountId)}
          >
            {mut.isPending ? 'Processing...' : 'Confirm Archive'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
