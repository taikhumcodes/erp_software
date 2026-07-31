import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import type { Employee, SalaryRecord, FinanceAccount } from '@/lib/finance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Users, Banknote, History, PlayCircle, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function SalaryManagement() {
  const [activeTab, setActiveTab] = useState<'employees' | 'salary'>('salary');
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const { data: employeesData } = useQuery({ queryKey: ['finance-employees'], queryFn: () => FinanceAPI.getEmployees() });
  const { data: salaryData } = useQuery({ queryKey: ['finance-salary'], queryFn: () => FinanceAPI.getSalaryRecords() });
  
  const employees: Employee[] = employeesData?.data || [];
  const salaries: SalaryRecord[] = salaryData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage employee payroll and salary advances</p>
        </div>
        {activeTab === 'employees' && (
          <Button onClick={() => setEmployeeModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        )}
      </div>

      <div className="flex space-x-2 border-b">
        <button
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'salary' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Banknote className="w-4 h-4 inline mr-2" /> Payroll Records
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'employees' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Users className="w-4 h-4 inline mr-2" /> Employees
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {activeTab === 'salary' ? <SalaryTable salaries={salaries} /> : <EmployeeTable employees={employees} />}
        </CardContent>
      </Card>
      
      <EmployeeModal isOpen={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)} />
    </div>
  );
}

function SalaryTable({ salaries }: { salaries: SalaryRecord[] }) {
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  return (
    <>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Month</TableHead>
            <TableHead>Employee</TableHead>
            <TableHead className="text-right">Basic</TableHead>
            <TableHead className="text-right">Allowances</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right font-bold">Net Salary (KWD)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {salaries.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No salary records found</TableCell></TableRow>
          ) : (
            salaries.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium whitespace-nowrap">{new Date(s.year, s.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</TableCell>
                <TableCell>
                  <p className="font-semibold">{s.employee.name}</p>
                  <p className="text-xs text-muted-foreground">{s.employee.employeeId}</p>
                </TableCell>
                <TableCell className="text-right">{Number(s.basicSalary).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
                <TableCell className="text-right text-emerald-600">+{Number(s.allowances).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
                <TableCell className="text-right text-red-600">-{Number(s.deductions).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
                <TableCell className="text-right font-bold text-lg">{Number(s.netSalary).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
                <TableCell>
                  <Badge variant={s.status === 'PAID' ? 'default' : 'outline'} className={s.status === 'PAID' ? 'bg-green-100 text-green-800' : ''}>
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {s.status === 'PENDING' && (
                    <Button size="sm" onClick={() => { setSelectedRecordId(s.id); setPayModalOpen(true); }}>
                      <PlayCircle className="w-4 h-4 mr-1" /> Pay
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      {selectedRecordId && (
        <PaySalaryModal 
          isOpen={payModalOpen} 
          onClose={() => { setPayModalOpen(false); setSelectedRecordId(null); }} 
          salaryId={selectedRecordId} 
        />
      )}
    </>
  );
}

function EmployeeTable({ employees }: { employees: Employee[] }) {
  return (
    <Table>
      <TableHeader className="bg-muted/50">
        <TableRow>
          <TableHead>Emp ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Designation</TableHead>
          <TableHead className="text-right">Basic Salary (KWD)</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.length === 0 ? (
          <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No employees found</TableCell></TableRow>
        ) : (
          employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="font-mono text-xs">{e.employeeId}</TableCell>
              <TableCell className="font-medium">{e.name}</TableCell>
              <TableCell>{e.designation || '-'}</TableCell>
              <TableCell className="text-right font-bold">{Number(e.basicSalary).toLocaleString('en-KW', { minimumFractionDigits: 3 })}</TableCell>
              <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function PaySalaryModal({ isOpen, onClose, salaryId }: { isOpen: boolean, onClose: () => void, salaryId: string }) {
  const [accountId, setAccountId] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: accountsData } = useQuery({ queryKey: ['finance-accounts'], queryFn: () => FinanceAPI.getAccounts() });
  const accounts: FinanceAccount[] = accountsData?.data?.filter((a: any) => a.status === 'ACTIVE') || [];

  const mut = useMutation({
    mutationFn: () => FinanceAPI.paySalary(salaryId, { accountId }),
    onSuccess: () => {
      toast({ title: 'Salary paid successfully' });
      queryClient.invalidateQueries({ queryKey: ['finance-salary'] });
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance-ledger'] });
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pay Salary</DialogTitle></DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium mb-2 block">Select Payment Account</label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} (Bal: {Number(a.calculatedBalance).toFixed(3)})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || !accountId}>
            {mut.isPending ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: (data: any) => FinanceAPI.createEmployee(data),
    onSuccess: () => {
      toast({ title: 'Employee added successfully' });
      queryClient.invalidateQueries({ queryKey: ['finance-employees'] });
      setName('');
      setEmployeeId('');
      setDesignation('');
      setBasicSalary('');
      onClose();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to add employee' }),
  });

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4 grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
          </div>
          <div className="col-span-1 space-y-2">
            <label className="text-sm font-medium">Employee ID</label>
            <Input value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. EMP-001" />
          </div>
          <div className="col-span-1 space-y-2">
            <label className="text-sm font-medium">Designation</label>
            <Input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Software Engineer" />
          </div>
          <div className="col-span-2 space-y-2">
            <label className="text-sm font-medium">Basic Salary (KWD)</label>
            <Input type="number" step="0.001" value={basicSalary} onChange={e => setBasicSalary(e.target.value)} placeholder="0.000" />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => mut.mutate({ name, employeeId, designation, basicSalary: Number(basicSalary) })} 
            disabled={mut.isPending || !name || !employeeId || !basicSalary}
          >
            {mut.isPending ? 'Saving...' : 'Add Employee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
