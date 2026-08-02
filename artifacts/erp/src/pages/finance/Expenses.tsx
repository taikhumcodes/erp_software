import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import type { Expense, FinanceAccount, ExpenseCategory } from '@/lib/finance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Search, Receipt, Trash2, CalendarDays, Edit2 } from 'lucide-react';

export default function Expenses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMut = useMutation({
    mutationFn: (id: string) => FinanceAPI.deleteExpense(id),
    onSuccess: () => {
      toast({ title: 'Expense deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Failed to delete expense', description: err.message }),
  });

  const { data: expensesData, isLoading } = useQuery({ queryKey: ['finance-expenses'], queryFn: () => FinanceAPI.getExpenses() });
  const expenses: Expense[] = expensesData?.items || [];

  const filtered = expenses.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.number.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage company expenses and operational costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}><CalendarDays className="w-4 h-4 mr-2" /> Categories</Button>
          <Button onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Record Expense</Button>
        </div>
      </div>

      <div className="flex gap-4 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expense Detail</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount (KWD)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No expenses found</TableCell></TableRow>
              ) : (
                filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{format(new Date(e.expenseDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="font-mono text-xs">{e.number}</TableCell>
                    <TableCell><Badge variant="secondary">{e.category.name}</Badge></TableCell>
                    <TableCell>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs text-muted-foreground">{e.vendor || 'No vendor'}</p>
                    </TableCell>
                    <TableCell>{e.account.name}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">
                      {Number(e.amount).toLocaleString('en-KW', { minimumFractionDigits: 3 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.status === 'PAID' ? 'default' : 'outline'} className={e.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}>
                        {e.status}
                      </Badge>
                      {e.isRecurring && <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">↻ {e.frequency}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingExpense(e); setIsModalOpen(true); }} className="h-8 w-8 text-muted-foreground hover:bg-muted">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => window.confirm('Are you sure you want to delete this expense? This will also revert the ledger entries and partner capital distributions.') && deleteMut.mutate(e.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={deleteMut.isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} expense={editingExpense} />
      <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </div>
  );
}

function ExpenseModal({ isOpen, onClose, expense }: { isOpen: boolean, onClose: () => void, expense?: Expense | null }) {
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  
  
  useEffect(() => {
    if (isOpen) {
      setCategoryId(expense?.category?.id || '');
      setAccountId(expense?.account?.id || '');
      setName(expense?.name || '');
      setVendor(expense?.vendor || '');
      setAmount(expense?.amount || '');
      setExpenseDate(expense ? format(new Date(expense.expenseDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(expense?.isRecurring || false);
      setFrequency(expense?.frequency || 'MONTHLY');
    }
  }, [isOpen, expense]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({ queryKey: ['finance-accounts'], queryFn: () => FinanceAPI.getAccounts() });
  const accounts: FinanceAccount[] = accountsData?.data?.filter((a: any) => a.status === 'ACTIVE') || [];

  const { data: categoriesData } = useQuery({ queryKey: ['finance-expense-categories'], queryFn: () => FinanceAPI.getExpenseCategories() });
  const categories: ExpenseCategory[] = categoriesData?.data || [];

  const { data: employeesData } = useQuery({ queryKey: ['finance-employees'], queryFn: () => FinanceAPI.getEmployees() });
  const employees = employeesData?.data || [];

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isSalaryCategory = selectedCategory?.name === 'Salary';

  const mut = useMutation({
    mutationFn: (data: any) => expense ? FinanceAPI.updateExpense(expense.id, data) : FinanceAPI.createExpense(data),
    onSuccess: () => {
      toast({ title: expense ? 'Expense updated' : 'Expense recorded' });
      queryClient.invalidateQueries({ queryKey: ['finance-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader><DialogTitle>{expense ? 'Edit Expense' : 'Record New Expense'}</DialogTitle></DialogHeader>
        {expense && <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">Amount and account cannot be changed after an expense is recorded. To change these, delete and recreate the expense.</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 col-span-2 md:col-span-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Category</label>
              <button type="button" onClick={() => setIsCategoryModalOpen(true)} className="text-xs text-primary hover:underline">
                + New Category
              </button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Payment Account</label>
            <Select value={accountId} onValueChange={setAccountId} disabled={!!expense}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.type})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Expense Title</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Supplies" />
          </div>
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">{isSalaryCategory ? 'Employee' : 'Vendor / Payee'}</label>
            {isSalaryCategory ? (
              <Select value={vendor} onValueChange={setVendor}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Jarir Bookstore" />
            )}
          </div>

          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Amount (KWD)</label>
            <Input type="number" step="0.001" value={amount} onChange={e => setAmount(e.target.value)} disabled={!!expense} />
          </div>
          <div className="space-y-2 col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Expense Date</label>
            <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} disabled={!!expense} />
          </div>

          <div className="col-span-2 border rounded-md p-4 mt-2 bg-muted/20">
            <label className="flex items-center space-x-2 mb-3">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium">This is a recurring expense</span>
            </label>
            {isRecurring && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Frequency</label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate({ categoryId, accountId, name, vendor, amount, expenseDate, isRecurring, frequency: isRecurring ? frequency : null })} disabled={mut.isPending || !categoryId || !accountId || !name || !amount}>
            {mut.isPending ? 'Saving...' : (expense ? 'Save Changes' : 'Record Expense')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    <CategoryModal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} />
    </>
  );
}

function CategoryModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: (data: any) => FinanceAPI.createExpenseCategory(data),
    onSuccess: () => {
      toast({ title: 'Category created' });
      queryClient.invalidateQueries({ queryKey: ['finance-expense-categories'] });
      setName('');
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader><DialogTitle>Create Expense Category</DialogTitle></DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Travel, Meals" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate({ name })} disabled={mut.isPending || !name.trim()}>
            {mut.isPending ? 'Saving...' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
