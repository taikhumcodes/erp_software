import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FinanceAPI } from '@/lib/finance-api';
import type { FinanceAuditLog } from '@/lib/finance-types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

export default function FinanceAuditLogs() {
  const { data, isLoading } = useQuery({ queryKey: ['finance-audit-logs'], queryFn: () => FinanceAPI.getAuditLogs() });
  const logs: FinanceAuditLog[] = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Immutable record of all financial actions</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Amount (KWD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && !isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No audit logs found</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.createdAt), 'dd MMM yyyy, HH:mm')}</TableCell>
                    <TableCell className="font-medium text-xs">{log.user.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{log.action.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="text-xs">{log.module}</TableCell>
                    <TableCell className="font-mono text-xs">{log.reference || log.referenceId || '-'}</TableCell>
                    <TableCell className="text-xs">{log.account?.name || '-'}</TableCell>
                    <TableCell className="text-right font-bold">{log.amount ? Number(log.amount).toLocaleString('en-KW', { minimumFractionDigits: 3 }) : '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
