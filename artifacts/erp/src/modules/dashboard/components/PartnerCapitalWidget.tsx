import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FinanceAPI } from '../../../lib/finance-api';
import { useToast } from '../../../hooks/use-toast';

export const PartnerCapitalWidget = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: response, isLoading } = useQuery({
    queryKey: ['finance-accounts', 'PARTNER_CAPITAL'],
    queryFn: () => FinanceAPI.getAccounts('type=PARTNER_CAPITAL&status=ACTIVE')
  });

  const { mutate: createAccount } = useMutation({
    mutationFn: (data: any) => FinanceAPI.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      toast({ title: 'Partner added successfully' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed to add partner', description: err.message });
    }
  });

  const { mutate: deleteAccount } = useMutation({
    mutationFn: (id: string) => FinanceAPI.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-accounts'] });
      toast({ title: 'Partner deleted successfully' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Failed to delete partner', description: err.message });
    }
  });

  const handleAddPartner = () => {
    const name = window.prompt(t('Enter Partner Name:'));
    if (name) {
      createAccount({
        name: name.trim(),
        type: 'PARTNER_CAPITAL',
        openingBalance: 0,
        currency: 'KWD'
      });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this partner account?')) {
      deleteAccount(id);
    }
  };

  const accounts = response?.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Partner Capital Profiles
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleAddPartner}>
          <Plus className="w-4 h-4 mr-2" />
          Add Partner
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4 mt-4">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
            No partner profiles exist yet. Add one to start tracking profit shares.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50">
                <div>
                  <div className="font-medium">{acc.name}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Capital Account</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KWD' }).format(Number(acc.calculatedBalance))}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(acc.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
