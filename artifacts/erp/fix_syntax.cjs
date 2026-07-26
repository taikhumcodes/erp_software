const fs = require('fs');
let code = fs.readFileSync('src/pages/sales.tsx', 'utf8');

const startIndex = code.indexOf('  const statusMutation = useMutation({');
const endIndexStr = '        </div>';
let endIndex = code.indexOf(endIndexStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const prefix = code.substring(0, startIndex);
  const suffix = code.substring(endIndex + endIndexStr.length);
  
  const replacement = `  const statusMutation = useMutation({
    mutationFn: () => updateSaleStatus(statusTarget!.id, { status: statusTarget!.newStatus }),
    onSuccess: () => {
      toast({ title: t('sale_status_updated') });
      setStatusTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setStatusTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['sales'] });
    void queryClient.invalidateQueries({ queryKey: ['sales-statistics'] });
    void queryClient.invalidateQueries({ queryKey: ['dos-for-invoice'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = salesQuery.data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('sales')}</h1>
        </div>`;
        
  fs.writeFileSync('src/pages/sales.tsx', prefix + replacement + suffix);
  console.log('Fixed successfully');
} else {
  console.log('Could not find indices');
}
